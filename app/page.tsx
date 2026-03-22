"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useState } from "react";

/* ─── Types ─── */

type Listing = {
  _id: string;
  listingId: string;
  platform: string;
  url: string;
  quartier: string;
  rooms?: number;
  surface_m2?: number;
  price?: number;
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

type Vehicle = {
  _id: string;
  vehicleId: string;
  platform: string;
  url: string;
  title: string;
  model: string;
  year?: number;
  price?: number;
  mileage_km?: number;
  location?: string;
  autonomy_km?: number;
  battery_kwh?: number;
  power_hp?: number;
  color?: string;
  status: string;
  notes?: string;
  reject_reason?: string;
  score?: number;
  added_at: number;
  last_seen: number;
};

type Tab = "tesla" | "housing";

/* ─── Shared Components ─── */

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="text-lg">{"\u2014"}</span>;
  const stars = "\u2B50".repeat(Math.min(score, 5));
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
    active: "bg-green-500",
    watching: "bg-yellow-500",
    sold: "bg-gray-600",
  };
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-bold text-white ${colors[status] || "bg-gray-500"}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function Check({ ok }: { ok?: boolean }) {
  if (ok === true) return <span className="text-green-400 font-bold">{"\u2705"}</span>;
  if (ok === false) return <span className="text-red-400">{"\u274C"}</span>;
  return <span className="text-gray-500">{"\u2753"}</span>;
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  );
}

/* ─── Housing Tab ─── */

function HousingTab() {
  const rawListings = useQuery(api.listings.getAll);

  if (rawListings === undefined) {
    return <LoadingState text="Loading listings..." />;
  }

  const data = rawListings as Listing[];
  const sorted = [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const maybes = sorted.filter(
    (l) =>
      l.status === "maybe" ||
      l.status === "new" ||
      l.status === "contacted" ||
      l.status === "applied"
  );
  const rejected = sorted.filter((l) => l.status === "rejected");

  const priced = data.filter((l) => l.price);
  const stats = {
    total: data.length,
    active: maybes.length,
    rejected: rejected.length,
    avgPrice:
      priced.length > 0
        ? Math.round(
            priced.reduce((sum, l) => sum + (l.price ?? 0), 0) / priced.length
          )
        : 0,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard value={stats.total} label="Total Indexed" color="text-blue-400" />
        <StatCard value={stats.active} label="Active / Maybe" color="text-yellow-400" />
        <StatCard value={stats.rejected} label="Rejected" color="text-red-400" />
        <StatCard
          value={`\u20AC${stats.avgPrice}`}
          label="Avg Price"
          color="text-green-400"
        />
      </div>

      {/* Criteria */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
        <h2 className="font-semibold text-gray-300 mb-2">
          {"\uD83D\uDD0D"} Search Criteria
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Luxembourg-Ville",
            "\u22642,800\u20AC CC",
            "2-3 chambres",
            "\u226575m\u00B2",
            "Non meubl\u00E9",
            "Parking \u2705",
            "Ascenseur \u2705",
            "RDC exclu",
            "Balcon preferred",
          ].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Quartiers: Belair, Limpertsberg, Merl, Cessange, Gasperich, Bonnevoie,
          Hollerich, Beggen, Muhlenbach, Cents, Hamm
        </div>
      </div>

      {/* Active Listings */}
      {maybes.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-yellow-400">
            {"\uD83D\uDD25"} Active Listings ({maybes.length})
          </h2>
          <div className="grid gap-4 mb-8">
            {maybes.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        </>
      )}

      {/* Rejected */}
      <h2 className="text-xl font-bold mb-4 text-gray-500">
        {"\u274C"} Rejected ({rejected.length})
      </h2>
      <div className="grid gap-4 mb-8 opacity-60">
        {rejected.map((listing) => (
          <ListingCard key={listing._id} listing={listing} />
        ))}
      </div>
    </>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.price ?? 0;
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={listing.status} />
            <span className="text-lg font-bold">
              {"\uD83D\uDCCD"} {listing.quartier}
            </span>
            <ScoreBadge score={listing.score} />
          </div>
          <div className="flex gap-6 text-sm mb-2">
            <span className="text-blue-400 font-bold text-xl">
              {"\u20AC"}
              {price}/mo
            </span>
            <span>
              {"\uD83D\uDECF\uFE0F"} {listing.rooms ?? "?"} ch
            </span>
            <span>
              {"\uD83D\uDCD0"}{" "}
              {listing.surface_m2 ? `${listing.surface_m2}m\u00B2` : "?m\u00B2"}
            </span>
            {listing.floor != null && (
              <span>
                {"\uD83C\uDFE2"} {"\u00C9"}tage {listing.floor}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm mb-2">
            <span>
              {"\uD83C\uDD7F\uFE0F"} <Check ok={listing.parking} />
            </span>
            <span>
              {"\uD83D\uDED7"} <Check ok={listing.elevator} />
            </span>
            <span>
              {"\uD83C\uDF3F"} <Check ok={listing.balcony} />
            </span>
            <span>
              {"\uD83E\uDE91"}{" "}
              {listing.furnished ? "\u274C Meubl\u00E9" : "\u2705 Vide"}
            </span>
          </div>
          {listing.notes && (
            <p className="text-gray-400 text-sm mt-1">{listing.notes}</p>
          )}
          {listing.reject_reason && listing.status === "rejected" && (
            <p className="text-red-400/70 text-xs mt-1">
              {"\u21B3"} {listing.reject_reason}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-gray-600 ml-4">
          <div>{listing.platform}</div>
          <div>{new Date(listing.added_at).toLocaleDateString("fr-FR")}</div>
          <div className="text-blue-400 mt-2">Voir {"\u2192"}</div>
        </div>
      </div>
    </a>
  );
}

/* ─── Tesla Watch Tab ─── */

function TeslaTab() {
  const rawVehicles = useQuery(api.vehicles.getAll);

  if (rawVehicles === undefined) {
    return <LoadingState text="Loading vehicles..." />;
  }

  const data = rawVehicles as Vehicle[];

  // Sort: active first (by price asc), then rejected (by price asc)
  const activeStatuses = new Set(["new", "active", "maybe", "watching", "contacted"]);
  const active = data
    .filter((v) => activeStatuses.has(v.status))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const rejected = data
    .filter((v) => !activeStatuses.has(v.status))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  const priced = data.filter((v) => v.price);
  const activePriced = active.filter((v) => v.price);
  const bestDeal = activePriced.length > 0
    ? activePriced.reduce((min, v) => ((v.price ?? Infinity) < (min.price ?? Infinity) ? v : min), activePriced[0])
    : null;

  const stats = {
    total: data.length,
    active: active.length,
    avgPrice:
      activePriced.length > 0
        ? Math.round(
            activePriced.reduce((sum, v) => sum + (v.price ?? 0), 0) /
              activePriced.length
          )
        : 0,
    bestPrice: bestDeal?.price ?? 0,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard value={stats.total} label="Total Indexed" color="text-blue-400" />
        <StatCard value={stats.active} label="Active" color="text-green-400" />
        <StatCard
          value={stats.avgPrice > 0 ? `\u20AC${stats.avgPrice.toLocaleString()}` : "\u2014"}
          label="Avg Price"
          color="text-yellow-400"
        />
        <StatCard
          value={stats.bestPrice > 0 ? `\u20AC${stats.bestPrice.toLocaleString()}` : "\u2014"}
          label="Best Deal"
          color="text-emerald-400"
        />
      </div>

      {/* Criteria pills */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
        <h2 className="font-semibold text-gray-300 mb-2">
          {"\uD83D\uDD0D"} Search Criteria
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            "Tesla Model Y 2023 \uD83C\uDDE9\uD83C\uDDEA",
            "\u226430K\u20AC",
            "Skoda Enyaq 2023",
            "\u226460,000 km",
            "EV Only",
          ].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Active Vehicles */}
      {active.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-green-400">
            {"\uD83D\uDD25"} Active ({active.length})
          </h2>
          <div className="grid gap-4 mb-8">
            {active.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
          </div>
        </>
      )}

      {/* Rejected / Sold */}
      {rejected.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 text-gray-500">
            {"\u274C"} Rejected / Sold ({rejected.length})
          </h2>
          <div className="grid gap-4 mb-8 opacity-60">
            {rejected.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
          </div>
        </>
      )}

      {data.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <div className="text-4xl mb-4">{"\uD83D\uDE97"}</div>
          <p className="text-lg">No vehicles indexed yet</p>
          <p className="text-sm mt-2">
            Vehicle data will appear here once the scanner starts feeding results
          </p>
        </div>
      )}
    </>
  );
}

function locationFlag(location?: string): string {
  if (!location) return "";
  const loc = location.toLowerCase();
  if (loc.includes("germany") || loc.includes("deutschland") || loc.includes("\uD83C\uDDE9\uD83C\uDDEA")) return " \uD83C\uDDE9\uD83C\uDDEA";
  if (loc.includes("france") || loc.includes("\uD83C\uDDEB\uD83C\uDDF7")) return " \uD83C\uDDEB\uD83C\uDDF7";
  if (loc.includes("luxembourg") || loc.includes("\uD83C\uDDF1\uD83C\uDDFA")) return " \uD83C\uDDF1\uD83C\uDDFA";
  if (loc.includes("belgium") || loc.includes("belgique") || loc.includes("\uD83C\uDDE7\uD83C\uDDEA")) return " \uD83C\uDDE7\uD83C\uDDEA";
  if (loc.includes("netherlands") || loc.includes("\uD83C\uDDF3\uD83C\uDDF1")) return " \uD83C\uDDF3\uD83C\uDDF1";
  return "";
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const price = vehicle.price ?? 0;
  const flag = locationFlag(vehicle.location);

  return (
    <a
      href={vehicle.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={vehicle.status} />
            <span className="text-lg font-bold">
              {vehicle.model}
              {vehicle.year ? ` (${vehicle.year})` : ""}
            </span>
            <ScoreBadge score={vehicle.score} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            <span className="text-blue-400 font-bold text-xl">
              {price > 0 ? `\u20AC${price.toLocaleString()}` : "Price TBD"}
            </span>
            {vehicle.mileage_km != null && (
              <span>
                {"\uD83D\uDEE3\uFE0F"} {vehicle.mileage_km.toLocaleString()} km
              </span>
            )}
            {vehicle.location && (
              <span>
                {"\uD83D\uDCCD"} {vehicle.location}
                {flag}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm mb-2">
            {vehicle.autonomy_km != null && (
              <span>
                {"\uD83D\uDD0B"} {vehicle.autonomy_km} km range
              </span>
            )}
            {vehicle.battery_kwh != null && (
              <span>
                {"\u26A1"} {vehicle.battery_kwh} kWh
              </span>
            )}
            {vehicle.power_hp != null && (
              <span>
                {"\uD83D\uDCAA"} {vehicle.power_hp} hp
              </span>
            )}
            {vehicle.color && (
              <span>
                {"\uD83C\uDFA8"} {vehicle.color}
              </span>
            )}
          </div>
          {vehicle.notes && (
            <p className="text-gray-400 text-sm mt-1">{vehicle.notes}</p>
          )}
          {vehicle.reject_reason && vehicle.status === "rejected" && (
            <p className="text-red-400/70 text-xs mt-1">
              {"\u21B3"} {vehicle.reject_reason}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-gray-600 ml-4">
          <span className="inline-block px-2 py-0.5 bg-gray-800 rounded text-gray-400 text-xs mb-1">
            {vehicle.platform}
          </span>
          <div>{new Date(vehicle.added_at).toLocaleDateString("fr-FR")}</div>
          <div className="text-blue-400 mt-2">Voir {"\u2192"}</div>
        </div>
      </div>
    </a>
  );
}

/* ─── Shared ─── */

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-gray-400 text-lg">{text}</div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function Home() {
  const [tab, setTab] = useState<Tab>("tesla");

  // Sync tab state with URL hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (hash === "housing" || hash === "tesla") {
      setTab(hash);
    }
  }, []);

  useEffect(() => {
    window.location.hash = tab;
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                {"\uD83D\uDCE1"} Luxembourg Radar
              </h1>
              <p className="text-gray-400 text-sm">
                Real-time scanner {"\u2022"} Live from Convex
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              {tab === "housing" && (
                <>
                  <div>Budget: {"\u2264"}2,800{"\u20AC"} CC</div>
                  <div>
                    2-3 ch {"\u2022"} {"\u2265"}75m{"\u00B2"} {"\u2022"} Parking{" "}
                    {"\u2022"} Ascenseur
                  </div>
                </>
              )}
              {tab === "tesla" && (
                <>
                  <div>Budget: {"\u2264"}30K{"\u20AC"}</div>
                  <div>EV {"\u2022"} 2023+ {"\u2022"} {"\u2264"}60K km</div>
                </>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1">
            <button
              onClick={() => setTab("housing")}
              className={`px-5 py-2.5 rounded-t-lg font-semibold text-sm transition-all ${
                tab === "housing"
                  ? "bg-gray-900 text-white border-t border-l border-r border-gray-700"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
              }`}
            >
              {"\uD83C\uDFE0"} Housing
            </button>
            <button
              onClick={() => setTab("tesla")}
              className={`px-5 py-2.5 rounded-t-lg font-semibold text-sm transition-all ${
                tab === "tesla"
                  ? "bg-gray-900 text-white border-t border-l border-r border-gray-700"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
              }`}
            >
              {"\uD83D\uDE97"} Tesla Watch
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === "housing" && <HousingTab />}
        {tab === "tesla" && <TeslaTab />}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-gray-600 text-sm">
        {tab === "housing"
          ? `Scanner active on: athome.lu \u2022 immotop.lu \u2022 wortimmo.lu \u2022 vivi.lu`
          : `Scanner active on: autoscout24.de \u2022 mobile.de \u2022 leboncoin.fr`}
        {" \u2014 Powered by OpenClaw \uD83E\uDD9E"}
      </footer>
    </div>
  );
}
