"use client";

import { useQuery } from "convex/react";
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

function ScoreBadge({ score }: { score?: number }) {
  if (!score) return <span className="text-lg">—</span>;
  const stars = '\u2B50'.repeat(Math.min(score, 5));
  return <span className="text-lg">{stars}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-blue-500',
    maybe: 'bg-yellow-500',
    contacted: 'bg-purple-500',
    visited: 'bg-indigo-500',
    rejected: 'bg-red-500',
    applied: 'bg-green-500',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${colors[status] || 'bg-gray-500'}`}>
      {status.toUpperCase()}
    </span>
  );
}

function Check({ ok }: { ok?: boolean }) {
  if (ok === true) return <span className="text-green-400 font-bold">{'\u2705'}</span>;
  if (ok === false) return <span className="text-red-400">{'\u274C'}</span>;
  return <span className="text-gray-500">{'\u2753'}</span>;
}

export default function Home() {
  const rawListings = useQuery(api.listings.getAll);

  if (rawListings === undefined) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading listings...</div>
      </div>
    );
  }

  const data = rawListings as Listing[];
  const sorted = [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const maybes = sorted.filter(l => l.status === 'maybe' || l.status === 'new' || l.status === 'contacted' || l.status === 'applied');
  const rejected = sorted.filter(l => l.status === 'rejected');

  const priced = data.filter(l => l.price);
  const stats = {
    total: data.length,
    active: maybes.length,
    rejected: rejected.length,
    avgPrice: priced.length > 0
      ? Math.round(priced.reduce((sum, l) => sum + (l.price ?? 0), 0) / priced.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{'\uD83C\uDFE0'} Luxembourg Housing Radar</h1>
            <p className="text-gray-400 text-sm">Real-time apartment scanner {'\u2022'} Live from Convex</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Budget: {'\u2264'}2,800{'\u20AC'} CC</div>
            <div>2-3 ch {'\u2022'} {'\u2265'}75m{'\u00B2'} {'\u2022'} Parking {'\u2022'} Ascenseur</div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
            <div className="text-gray-500 text-sm">Total Indexed</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-3xl font-bold text-yellow-400">{stats.active}</div>
            <div className="text-gray-500 text-sm">Active / Maybe</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-3xl font-bold text-red-400">{stats.rejected}</div>
            <div className="text-gray-500 text-sm">Rejected</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-3xl font-bold text-green-400">{'\u20AC'}{stats.avgPrice}</div>
            <div className="text-gray-500 text-sm">Avg Price</div>
          </div>
        </div>

        {/* Criteria */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
          <h2 className="font-semibold text-gray-300 mb-2">{'\uD83D\uDD0D'} Search Criteria</h2>
          <div className="flex flex-wrap gap-2">
            {['Luxembourg-Ville', '\u22642,800\u20AC CC', '2-3 chambres', '\u226575m\u00B2', 'Non meubl\u00E9', 'Parking \u2705', 'Ascenseur \u2705', 'RDC exclu', 'Balcon preferred'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300">{tag}</span>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Quartiers: Belair, Limpertsberg, Merl, Cessange, Gasperich, Bonnevoie, Hollerich, Beggen, Muhlenbach, Cents, Hamm
          </div>
        </div>

        {/* Active Listings */}
        {maybes.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4 text-yellow-400">{'\uD83D\uDD25'} Active Listings ({maybes.length})</h2>
            <div className="grid gap-4 mb-8">
              {maybes.map(listing => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
            </div>
          </>
        )}

        {/* Rejected */}
        <h2 className="text-xl font-bold mb-4 text-gray-500">{'\u274C'} Rejected ({rejected.length})</h2>
        <div className="grid gap-4 mb-8 opacity-60">
          {rejected.map(listing => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-gray-600 text-sm">
        Scanner active on: athome.lu {'\u2022'} immotop.lu {'\u2022'} wortimmo.lu {'\u2022'} vivi.lu — Powered by OpenClaw {'\uD83E\uDD9E'}
      </footer>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.price ?? 0;
  return (
    <a href={listing.url} target="_blank" rel="noopener noreferrer"
       className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={listing.status} />
            <span className="text-lg font-bold">{'\uD83D\uDCCD'} {listing.quartier}</span>
            <ScoreBadge score={listing.score} />
          </div>
          <div className="flex gap-6 text-sm mb-2">
            <span className="text-blue-400 font-bold text-xl">{'\u20AC'}{price}/mo</span>
            <span>{'\uD83D\uDECF\uFE0F'} {listing.rooms ?? '?'} ch</span>
            <span>{'\uD83D\uDCD0'} {listing.surface_m2 ? `${listing.surface_m2}m\u00B2` : '?m\u00B2'}</span>
            {listing.floor != null && <span>{'\uD83C\uDFE2'} {'\u00C9'}tage {listing.floor}</span>}
          </div>
          <div className="flex gap-4 text-sm mb-2">
            <span>{'\uD83C\uDD7F\uFE0F'} <Check ok={listing.parking} /></span>
            <span>{'\uD83D\uDED7'} <Check ok={listing.elevator} /></span>
            <span>{'\uD83C\uDF3F'} <Check ok={listing.balcony} /></span>
            <span>{'\uD83E\uDE91'} {listing.furnished ? '\u274C Meubl\u00E9' : '\u2705 Vide'}</span>
          </div>
          {listing.notes && <p className="text-gray-400 text-sm mt-1">{listing.notes}</p>}
          {listing.reject_reason && listing.status === 'rejected' && (
            <p className="text-red-400/70 text-xs mt-1">{'\u21B3'} {listing.reject_reason}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-600 ml-4">
          <div>{listing.platform}</div>
          <div>{new Date(listing.added_at).toLocaleDateString('fr-FR')}</div>
          <div className="text-blue-400 mt-2">Voir {'\u2192'}</div>
        </div>
      </div>
    </a>
  );
}
