"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type Listing = {
  _id: string;
  listingId: string;
  platform: string;
  url: string;
  quartier: string;
  rooms?: number;
  surface_m2?: number;
  price?: number;
  charges_eur?: number;
  bathtub?: boolean;
  dpe?: string;
  parking?: boolean;
  elevator?: boolean;
  balcony?: boolean;
  floor?: number;
  furnished?: boolean;
  status: string;
  reject_reason?: string;
  notes?: string;
  score?: number;
  added_at: number;
  last_seen: number;
};

type UndoEntry = {
  id: string;
  previousStatus: string;
  previousRejectReason?: string;
};

const SCORE_WEIGHTS = {
  totalPrice: 30,
  pricePerSqm: 18,
  surface: 18,
  bathtub: 10,
  parking: 15,
  dpe: 10,
} as const;

const LUXEMBOURG_CITY_QUARTIERS = new Set([
  "belair",
  "limpertsberg",
  "merl",
  "cessange",
  "gasperich",
  "bonnevoie",
  "hollerich",
  "beggen",
  "muhlenbach",
  "mühlenbach",
  "hamm",
  "rollingergrund",
  "dommeldange",
  "kirchberg",
  "gare",
  "centre",
  "clausen",
  "grund",
  "pfaffenthal",
  "weimerskirch",
  "eich",
  "neudorf",
  "luxembourg",
]);

const SCORE_WEIGHT_TOTAL = Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function scorePrice(grossRent: number | null) {
  if (grossRent == null) return 0.5;
  if (grossRent <= 2200) return 1;
  if (grossRent >= 3100) return 0;
  return clamp((3100 - grossRent) / 900);
}

function scorePricePerSqm(pricePerSqm: number | null) {
  if (pricePerSqm == null) return 0.5;
  if (pricePerSqm <= 25) return 1;
  if (pricePerSqm >= 38) return 0;
  return clamp((38 - pricePerSqm) / 13);
}

function scoreSurface(surface: number | null) {
  if (surface == null) return 0.5;
  if (surface <= 75) return 0;
  if (surface >= 110) return 1;
  return clamp((surface - 75) / 35);
}

function scoreBoolean(value: boolean | null, unknownNeutral = 0.5) {
  if (value == null) return unknownNeutral;
  return value ? 1 : 0;
}

function dpeNumeric(letter: string | null) {
  if (!letter) return 0.5;
  const scale: Record<string, number> = {
    A: 1,
    B: 0.9,
    C: 0.75,
    D: 0.55,
    E: 0.35,
    F: 0.15,
    G: 0,
  };
  return scale[letter] ?? 0.5;
}

function dpePenaltyMultiplier(letter: string | null) {
  if (!letter) return 0.9;
  const scale: Record<string, number> = {
    A: 1,
    B: 0.98,
    C: 0.95,
    D: 0.88,
    E: 0.78,
    F: 0.65,
    G: 0.5,
  };
  return scale[letter] ?? 0.9;
}

function formatEuro(value?: number | null) {
  if (value == null) return "N/C";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;
}

function formatArea(value?: number | null) {
  if (value == null) return "N/C";
  return `${Math.round(value)} m²`;
}

function formatEuroPerSqm(value: number | null) {
  if (value == null) return "N/C";
  return `${Math.round(value)} €/m²`;
}

function formatShortDate(value: number) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatBoolLabel(value: boolean | null, yes = "Oui", no = "Non") {
  if (value == null) return "N/C";
  return value ? yes : no;
}

function formatFurnished(value: boolean | null) {
  if (value == null) return "N/C";
  return value ? "Meublé" : "Non meublé";
}

function compactQuartier(value: string) {
  return value === "Unknown" ? "—" : value;
}

function isLuxembourgCityQuartier(value?: string) {
  if (!value) return false;
  return LUXEMBOURG_CITY_QUARTIERS.has(value.trim().toLowerCase());
}

function inferLocalitySlugFromUrl(url: string) {
  const match = url.match(/\/apartment\/([^/]+)\//i);
  return match ? decodeURIComponent(match[1]).trim().toLowerCase() : null;
}

function isLuxembourgCityListing(listing: Listing) {
  const url = listing.url.toLowerCase();

  if (url.includes("athome.lu") || url.includes("immotop.lu")) {
    return isLuxembourgCityQuartier(listing.quartier);
  }

  if (url.includes("vivi.lu")) {
    const localitySlug = inferLocalitySlugFromUrl(url);
    if (localitySlug) {
      return LUXEMBOURG_CITY_QUARTIERS.has(localitySlug);
    }
  }

  return isLuxembourgCityQuartier(listing.quartier);
}

function prettyStatus(listing: Listing) {
  if (listing.status === "visited") return "Visité";
  if (listing.status === "contacted") return "Contacté";
  if (listing.status === "applied") return "Dossier envoyé";
  if (listing.status === "maybe") return "À retenir ✓";
  if (listing.status === "new") return "Nouveau";
  if (listing.status === "rejected") return listing.reject_reason ? `Rejeté — ${listing.reject_reason}` : "Rejeté";
  return listing.status;
}

function listingLabel(listing: Listing) {
  return `Appartement ${listing.quartier}`;
}

function computeRow(listing: Listing) {
  const total = listing.price ?? null;
  const charges = listing.charges_eur ?? null;
  const grossRent = total != null && charges != null ? Math.max(total - charges, 0) : total;
  const pricePerSqm = grossRent != null && listing.surface_m2 ? grossRent / listing.surface_m2 : null;
  const weightedRaw =
    scorePrice(grossRent) * SCORE_WEIGHTS.totalPrice +
    scorePricePerSqm(pricePerSqm) * SCORE_WEIGHTS.pricePerSqm +
    scoreSurface(listing.surface_m2 ?? null) * SCORE_WEIGHTS.surface +
    scoreBoolean(listing.bathtub ?? null) * SCORE_WEIGHTS.bathtub +
    scoreBoolean(listing.parking ?? null) * SCORE_WEIGHTS.parking +
    dpeNumeric(listing.dpe ?? null) * SCORE_WEIGHTS.dpe;

  const normalizedScore = (weightedRaw / SCORE_WEIGHT_TOTAL) * 100;
  const adjustedScore = normalizedScore * dpePenaltyMultiplier(listing.dpe ?? null);

  return {
    ...listing,
    label: listingLabel(listing),
    charges,
    grossRent,
    total,
    pricePerSqm,
    globalScore: Number(adjustedScore.toFixed(1)),
    visitStatus: prettyStatus(listing),
  };
}

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="text-lg">—</span>;
  const stars = "⭐".repeat(Math.min(score, 5));
  return <span className="text-lg">{stars}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    maybe: "bg-yellow-500",
    contacted: "bg-purple-500",
    visited: "bg-indigo-500",
    rejected: "bg-red-500",
    applied: "bg-green-500",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${colors[status] || "bg-gray-500"}`}>{status.toUpperCase()}</span>;
}

function Check({ ok }: { ok?: boolean }) {
  if (ok === true) return <span className="text-green-400 font-bold">✅</span>;
  if (ok === false) return <span className="text-red-400">❌</span>;
  return <span className="text-gray-500">❓</span>;
}

function ListingsTable({
  title,
  subtitle,
  rows,
  onReject,
  onUndoReject,
  pendingIds,
  canReject,
  undoableIds,
}: {
  title: string;
  subtitle: string;
  rows: ReturnType<typeof computeRow>[];
  onReject?: (row: ReturnType<typeof computeRow>) => Promise<void>;
  onUndoReject?: (row: ReturnType<typeof computeRow>) => Promise<void>;
  pendingIds?: Record<string, boolean>;
  canReject?: boolean;
  undoableIds?: Set<string>;
}) {
  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-cyan-300">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className="px-2 py-2 md:px-3 overflow-x-auto">
        <table className="w-full min-w-[1600px] table-fixed text-[11px] leading-tight md:text-xs">
          <colgroup>
            <col className="w-[10%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
            <col className="w-[5%]" />
            <col className="w-[4%]" />
            <col className="w-[5%]" />
            <col className="w-[6%]" />
            <col className="w-[9%]" />
            <col className="w-[13%]" />
            <col className="w-[7%]" />
          </colgroup>
          <thead className="bg-gray-950/80 text-gray-300">
            <tr className="border-b border-gray-800">
              {[
                "Annonce",
                "Quartier",
                "Loyer brut",
                "Charges",
                "Total",
                "Superficie (m²)",
                "Nb de pièces",
                "Meublé",
                "Baignoire",
                "Parking",
                "DPE",
                "€/m²",
                "Score global",
                "Statut visite",
                "URL complète",
                "Actions",
              ].map((header) => (
                <th key={header} className="px-2 py-2 text-left font-semibold break-words align-top">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isUndoable = undoableIds?.has(row._id) ?? false;
              const isPending = !!pendingIds?.[row._id];
              return (
                <tr key={row._id} className="border-b border-gray-800/70">
                  <td className="px-2 py-2 font-medium break-words align-top">{row.label}</td>
                  <td className="px-2 py-2 break-words align-top">{compactQuartier(row.quartier)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatEuro(row.grossRent)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatEuro(row.charges)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatEuro(row.total)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatArea(row.surface_m2)}</td>
                  <td className="px-2 py-2 break-words align-top">{row.rooms ?? "N/C"}</td>
                  <td className="px-2 py-2 break-words align-top">{formatFurnished(row.furnished ?? null)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatBoolLabel(row.bathtub ?? null)}</td>
                  <td className="px-2 py-2 break-words align-top">{formatBoolLabel(row.parking ?? null, "1 int.", "Non")}</td>
                  <td className="px-2 py-2 break-words align-top">{row.dpe ?? "N/C"}</td>
                  <td className="px-2 py-2 break-words align-top">{formatEuroPerSqm(row.pricePerSqm)}</td>
                  <td className="px-2 py-2 break-words align-top font-semibold text-cyan-300">{row.globalScore.toFixed(1)}</td>
                  <td className="px-2 py-2 break-words align-top text-gray-300">{row.visitStatus}</td>
                  <td className="px-2 py-2 break-all align-top">
                    <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                      {row.url}
                    </a>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <div className="flex flex-col gap-2">
                      {canReject && onReject && (
                        <button
                          type="button"
                          onClick={() => void onReject(row)}
                          disabled={isPending}
                          className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Moving..." : "Reject"}
                        </button>
                      )}
                      {!canReject && isUndoable && onUndoReject && (
                        <button
                          type="button"
                          onClick={() => void onUndoReject(row)}
                          disabled={isPending}
                          className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Rolling back..." : "Rollback"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BestActiveScatter({ rows }: { rows: ReturnType<typeof computeRow>[] }) {
  if (rows.length === 0) return null;

  const points = rows.slice(0, 15);
  const width = 960;
  const height = 360;
  const padLeft = 68;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 46;

  const addedValues = points.map((row) => row.added_at);
  const scoreValues = points.map((row) => row.globalScore);
  const priceValues = points.map((row) => row.total ?? 0);

  const minAdded = Math.min(...addedValues);
  const maxAdded = Math.max(...addedValues);
  const minScore = Math.min(...scoreValues);
  const maxScore = Math.max(...scoreValues);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const xFor = (value: number) => {
    const ratio = maxAdded === minAdded ? 0.5 : (value - minAdded) / (maxAdded - minAdded);
    return padLeft + ratio * plotWidth;
  };

  const yFor = (value: number) => {
    const ratio = maxScore === minScore ? 0.5 : (value - minScore) / (maxScore - minScore);
    return padTop + plotHeight - ratio * plotHeight;
  };

  const rFor = (value: number) => {
    const ratio = maxPrice === minPrice ? 0.6 : (value - minPrice) / (maxPrice - minPrice);
    return 6 + ratio * 10;
  };

  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-cyan-300">🎯 Nuage de points — meilleures annonces actives</h2>
        <p className="text-sm text-gray-400 mt-1">X = date de sortie, Y = score global, taille du point = prix. Top 15 annonces actives.</p>
      </div>
      <div className="p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-lg bg-gray-950 border border-gray-800">
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#4b5563" strokeWidth="1" />
          <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#4b5563" strokeWidth="1" />

          {[0, 0.5, 1].map((ratio) => {
            const xVal = Math.round(minAdded + ratio * (maxAdded - minAdded || 1));
            const x = padLeft + ratio * plotWidth;
            return (
              <g key={`x-${ratio}`}>
                <line x1={x} y1={padTop} x2={x} y2={height - padBottom} stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" />
                <text x={x} y={height - 14} textAnchor="middle" fill="#9ca3af" fontSize="12">{formatShortDate(xVal)}</text>
              </g>
            );
          })}

          {[0, 0.5, 1].map((ratio) => {
            const yVal = minScore + ratio * (maxScore - minScore || 1);
            const y = padTop + plotHeight - ratio * plotHeight;
            return (
              <g key={`y-${ratio}`}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1f2937" strokeWidth="1" strokeDasharray="4 4" />
                <text x={padLeft - 10} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="12">{yVal.toFixed(1)}</text>
              </g>
            );
          })}

          {points.map((row) => {
            const x = xFor(row.added_at);
            const y = yFor(row.globalScore);
            const r = rFor(row.total ?? minPrice);
            return (
              <g key={row._id}>
                <circle cx={x} cy={y} r={r} fill="#22d3ee" fillOpacity="0.75" stroke="#67e8f9" strokeWidth="2">
                  <title>{`${row.label} — sortie ${new Date(row.added_at).toLocaleDateString("fr-FR")} — score ${row.globalScore.toFixed(1)} — prix ${formatEuro(row.total)}`}</title>
                </circle>
                <text x={x} y={y - r - 6} textAnchor="middle" fill="#e5e7eb" fontSize="11">{compactQuartier(row.quartier)}</text>
              </g>
            );
          })}

          <text x={width / 2} y={height - 4} textAnchor="middle" fill="#cbd5e1" fontSize="13">Date de sortie</text>
          <text x={18} y={height / 2} textAnchor="middle" fill="#cbd5e1" fontSize="13" transform={`rotate(-90 18 ${height / 2})`}>Score global</text>
        </svg>
      </div>
    </section>
  );
}

export default function Home() {
  const rawListings = useQuery(api.listings.getAll);
  const updateStatus = useMutation(api.listings.updateStatus);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [undoById, setUndoById] = useState<Record<string, UndoEntry>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("housing-dashboard-undo");
    if (!saved) return;
    try {
      setUndoById(JSON.parse(saved) as Record<string, UndoEntry>);
    } catch {
      window.sessionStorage.removeItem("housing-dashboard-undo");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("housing-dashboard-undo", JSON.stringify(undoById));
  }, [undoById]);

  if (rawListings === undefined) {
    return <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center"><div className="text-gray-400 text-lg">Loading listings...</div></div>;
  }

  const data = (rawListings as Listing[]).filter((listing) => isLuxembourgCityListing(listing));
  const rows = data.map(computeRow).sort((a, b) => b.globalScore - a.globalScore);
  const unfurnishedEligibleRows = rows.filter((row) => row.furnished !== true);
  const withinHardBudgetRows = unfurnishedEligibleRows.filter((row) => row.grossRent == null || row.grossRent <= 3100);
  const activeRows = withinHardBudgetRows.filter((row) => row.status !== "rejected");
  const rejectedRows = rows.filter((row) => row.status === "rejected");
  const undoableIds = new Set(Object.keys(undoById));
  const priced = data.filter((l) => l.price);
  const stats = {
    total: data.length,
    active: activeRows.length,
    rejected: rejectedRows.length,
    avgPrice: priced.length > 0 ? Math.round(priced.reduce((sum, l) => sum + (l.price ?? 0), 0) / priced.length) : 0,
  };

  async function handleReject(row: ReturnType<typeof computeRow>) {
    setPendingIds((current) => ({ ...current, [row._id]: true }));
    try {
      await updateStatus({
        id: row._id as never,
        status: "rejected",
        reject_reason: "Rejected manually from dashboard",
      });
      setUndoById((current) => ({
        ...current,
        [row._id]: {
          id: row._id,
          previousStatus: row.status,
          previousRejectReason: row.reject_reason,
        },
      }));
    } finally {
      setPendingIds((current) => {
        const next = { ...current };
        delete next[row._id];
        return next;
      });
    }
  }

  async function handleUndoReject(row: ReturnType<typeof computeRow>) {
    const undo = undoById[row._id];
    if (!undo) return;
    setPendingIds((current) => ({ ...current, [row._id]: true }));
    try {
      await updateStatus({
        id: row._id as never,
        status: undo.previousStatus,
        reject_reason: undo.previousRejectReason ?? "",
      });
      setUndoById((current) => {
        const next = { ...current };
        delete next[row._id];
        return next;
      });
    } finally {
      setPendingIds((current) => {
        const next = { ...current };
        delete next[row._id];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">🏠 Luxembourg Housing Radar</h1>
            <p className="text-gray-400 text-sm">Real-time apartment scanner • Live from Convex</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Budget: ≤3,100€ HC</div>
            <div>2-3 ch • ≥75m² • Parking • Ascenseur</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-3xl font-bold text-blue-400">{stats.total}</div><div className="text-gray-500 text-sm">Total Indexed</div></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-3xl font-bold text-yellow-400">{stats.active}</div><div className="text-gray-500 text-sm">Active</div></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-3xl font-bold text-red-400">{stats.rejected}</div><div className="text-gray-500 text-sm">Rejected</div></div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><div className="text-3xl font-bold text-green-400">€{stats.avgPrice}</div><div className="text-gray-500 text-sm">Avg Price</div></div>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
          <h2 className="font-semibold text-gray-300 mb-2">🔍 Search Criteria</h2>
          <div className="flex flex-wrap gap-2">
            {["Luxembourg-Ville", "≤3,100€ HC", "2-3 chambres", "≥75m²", "Non meublé requis (sinon exclu)", "Parking ✅", "Ascenseur ✅", "RDC exclu", "Balcon preferred"].map((tag) => (
              <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">{tag}</span>
            ))}
          </div>
        </div>

        <BestActiveScatter rows={activeRows} />

        <ListingsTable
          title="📊 Classement des annonces actives"
          subtitle="Tableau trié par score global décroissant."
          rows={activeRows}
          canReject
          onReject={handleReject}
          pendingIds={pendingIds}
        />
        <ListingsTable
          title="❌ Annonces rejetées"
          subtitle="Même format, séparé en dessous pour les refus."
          rows={rejectedRows}
          onUndoReject={handleUndoReject}
          pendingIds={pendingIds}
          undoableIds={undoableIds}
        />

        <section className="bg-gray-900 rounded-xl border border-gray-800 mb-8 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-gray-200">Paramètres du score (modifiables)</h2>
            <p className="text-xs text-gray-500 mt-1">Poids fournis: 30 + 18 + 18 + 10 + 15 + 10 = 101, score normalisé automatiquement sur 100, puis pénalisé selon le DPE (F/G fortement dégradés).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm"><tbody>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids prix (total)</td><td className="px-4 py-3 text-right text-gray-100">30%</td></tr>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids €/m²</td><td className="px-4 py-3 text-right text-gray-100">18%</td></tr>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids superficie</td><td className="px-4 py-3 text-right text-gray-100">18%</td></tr>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids baignoire</td><td className="px-4 py-3 text-right text-gray-100">10%</td></tr>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids parking</td><td className="px-4 py-3 text-right text-gray-100">15%</td></tr>
              <tr className="border-b border-gray-800/70"><td className="px-4 py-3 text-gray-300">Poids DPE</td><td className="px-4 py-3 text-right text-gray-100">10%</td></tr>
              <tr><td className="px-4 py-3 font-semibold text-gray-100">Total poids</td><td className="px-4 py-3 text-right font-semibold text-gray-100">100%</td></tr>
            </tbody></table>
          </div>
        </section>

        <h2 className="text-xl font-bold mb-4 text-yellow-400">🔥 Cards view</h2>
        <div className="grid gap-4 mb-8">
          {data.filter((listing) => listing.furnished !== true).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((listing) => <ListingCard key={listing._id} listing={listing} />)}
        </div>
      </div>

      <footer className="border-t border-gray-800 px-6 py-4 text-center text-gray-600 text-sm">Scanner active on: athome.lu • vivi.lu — Powered by OpenClaw 🦞</footer>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.price ?? 0;
  return (
    <a href={listing.url} target="_blank" rel="noopener noreferrer" className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={listing.status} />
            <span className="text-lg font-bold">📍 {listing.quartier}</span>
            <ScoreBadge score={listing.score} />
          </div>
          <div className="flex gap-6 text-sm mb-2 flex-wrap">
            <span className="text-blue-400 font-bold text-xl">€{price}/mo</span>
            <span>🛏️ {listing.rooms ?? "?"} ch</span>
            <span>📐 {listing.surface_m2 ? `${listing.surface_m2}m²` : "?m²"}</span>
            {listing.floor != null && <span>🏢 Étage {listing.floor}</span>}
          </div>
          <div className="flex gap-4 text-sm mb-2 flex-wrap">
            <span>🅿️ <Check ok={listing.parking} /></span>
            <span>🛗 <Check ok={listing.elevator} /></span>
            <span>🌿 <Check ok={listing.balcony} /></span>
            <span>🪑 {formatFurnished(listing.furnished ?? null)}</span>
            <span>🛁 {formatBoolLabel(listing.bathtub ?? null)}</span>
            <span>DPE {listing.dpe ?? "N/C"}</span>
            <span>Charges {formatEuro(listing.charges_eur)}</span>
          </div>
          {listing.notes && <p className="text-gray-400 text-sm mt-1">{listing.notes}</p>}
          {listing.reject_reason && listing.status === "rejected" && <p className="text-red-400/70 text-xs mt-1">↳ {listing.reject_reason}</p>}
        </div>
        <div className="text-right text-xs text-gray-600 ml-4">
          <div>{listing.platform}</div>
          <div>{new Date(listing.added_at).toLocaleDateString("fr-FR")}</div>
          <div className="text-blue-400 mt-2">Voir →</div>
        </div>
      </div>
    </a>
  );
}
