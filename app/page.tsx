import listings from '../data/listings.json';

type Listing = {
  id: string;
  platform: string;
  url: string;
  quartier: string;
  rooms: number;
  surface_m2: number | null;
  price_rent: number | null;
  price_cc: number | null;
  parking: boolean;
  elevator: boolean;
  balcony: boolean;
  floor: number | null;
  furnished: boolean;
  added: string;
  score: number;
  status: string;
  reject_reason: string;
  notes: string;
};

function ScoreBadge({ score }: { score: number }) {
  const stars = '⭐'.repeat(Math.min(score, 5));
  return <span className="text-lg">{stars || '—'}</span>;
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

function Check({ ok }: { ok: boolean | null }) {
  if (ok === true) return <span className="text-green-400 font-bold">✅</span>;
  if (ok === false) return <span className="text-red-400">❌</span>;
  return <span className="text-gray-500">❓</span>;
}

export default function Home() {
  const data = listings as Listing[];
  const sorted = [...data].sort((a, b) => b.score - a.score);
  const maybes = sorted.filter(l => l.status === 'maybe' || l.status === 'new' || l.status === 'contacted' || l.status === 'applied');
  const rejected = sorted.filter(l => l.status === 'rejected');
  
  const stats = {
    total: data.length,
    active: maybes.length,
    rejected: rejected.length,
    avgPrice: Math.round(data.filter(l => l.price_cc || l.price_rent).reduce((sum, l) => sum + (l.price_cc || l.price_rent || 0), 0) / data.filter(l => l.price_cc || l.price_rent).length),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏠 Luxembourg Housing Radar</h1>
            <p className="text-gray-400 text-sm">Real-time apartment scanner • Updated every 2 min</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Budget: ≤2,800€ CC</div>
            <div>2-3 ch • ≥75m² • Parking • Ascenseur</div>
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
            <div className="text-3xl font-bold text-green-400">€{stats.avgPrice}</div>
            <div className="text-gray-500 text-sm">Avg Price</div>
          </div>
        </div>

        {/* Criteria */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-8">
          <h2 className="font-semibold text-gray-300 mb-2">🔍 Search Criteria</h2>
          <div className="flex flex-wrap gap-2">
            {['Luxembourg-Ville', '≤2,800€ CC', '2-3 chambres', '≥75m²', 'Non meublé', 'Parking ✅', 'Ascenseur ✅', 'RDC exclu', 'Balcon preferred'].map(tag => (
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
            <h2 className="text-xl font-bold mb-4 text-yellow-400">🔥 Active Listings ({maybes.length})</h2>
            <div className="grid gap-4 mb-8">
              {maybes.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}

        {/* Rejected */}
        <h2 className="text-xl font-bold mb-4 text-gray-500">❌ Rejected ({rejected.length})</h2>
        <div className="grid gap-4 mb-8 opacity-60">
          {rejected.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-gray-600 text-sm">
        Scanner active on: athome.lu • immotop.lu • wortimmo.lu • vivi.lu — Powered by OpenClaw 🦞
      </footer>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const price = listing.price_cc || listing.price_rent || 0;
  return (
    <a href={listing.url} target="_blank" rel="noopener noreferrer"
       className="block bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-900/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={listing.status} />
            <span className="text-lg font-bold">📍 {listing.quartier}</span>
            <ScoreBadge score={listing.score} />
          </div>
          <div className="flex gap-6 text-sm mb-2">
            <span className="text-blue-400 font-bold text-xl">€{price}/mo</span>
            <span>🛏️ {listing.rooms} ch</span>
            <span>📐 {listing.surface_m2 ? `${listing.surface_m2}m²` : '?m²'}</span>
            {listing.floor !== null && <span>🏢 Étage {listing.floor}</span>}
          </div>
          <div className="flex gap-4 text-sm mb-2">
            <span>🅿️ <Check ok={listing.parking} /></span>
            <span>🛗 <Check ok={listing.elevator} /></span>
            <span>🌿 <Check ok={listing.balcony} /></span>
            <span>🪑 {listing.furnished ? '❌ Meublé' : '✅ Vide'}</span>
          </div>
          {listing.notes && <p className="text-gray-400 text-sm mt-1">{listing.notes}</p>}
          {listing.reject_reason && listing.status === 'rejected' && (
            <p className="text-red-400/70 text-xs mt-1">↳ {listing.reject_reason}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-600 ml-4">
          <div>{listing.platform}</div>
          <div>{new Date(listing.added).toLocaleDateString('fr-FR')}</div>
          <div className="text-blue-400 mt-2">Voir →</div>
        </div>
      </div>
    </a>
  );
}
