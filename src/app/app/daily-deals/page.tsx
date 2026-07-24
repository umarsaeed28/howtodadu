import ParcelCard from "@/components/pencil-app/ParcelCard";
import SubscribeBanner from "@/components/pencil-app/SubscribeBanner";
import DealsDate from "@/components/pencil-app/DealsDate";
import { parcels } from "@/lib/parcels";

export const metadata = { title: "Daily deals — Pencil" };

export default function DailyDealsPage() {
  const todaysDeals = parcels
    .filter((p) => p.verdict === "PENCILS")
    .sort((a, b) => b.marginPct - a.marginPct);

  return (
      <main className="app-content-pad space-y-6">
        <header>
          <p className="pa-eyebrow" style={{ color: "var(--blue)" }}>
            Daily sourcing · <DealsDate />
          </p>
          <h1 className="pa-display mt-1 text-2xl">Parcels that pencil today</h1>
          <p className="text-sm" style={{ color: "var(--slate)" }}>
            <span className="pa-mono">{todaysDeals.length}</span> new deals, ranked by margin.
          </p>
        </header>

        <SubscribeBanner />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {todaysDeals.map((p, i) => (
            <div key={p.id} className="relative">
              <span
                className="pa-mono absolute -left-1 -top-2 z-10 rounded-full px-2 py-0.5 text-xs"
                style={{ background: "var(--ink)", color: "#fff" }}
                aria-label={`Rank ${i + 1}`}
              >
                #{i + 1}
              </span>
              <ParcelCard parcel={p} />
            </div>
          ))}
        </div>
      </main>
  );
}
