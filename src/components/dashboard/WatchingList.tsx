import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prettyAddress } from "@/lib/parcel-context";

export type WatchRow = {
  id: string;
  listing_id: string;
  parcel_pin: string | null;
  address: string;
  photo: string | null;
  alert: "price_changed" | "off_market" | null;
  snapshot: { price?: number; cash_required?: number; total_project_cost?: number; dadu_sqft?: number; score?: number; as_of?: string };
};

const usdK = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M` : `$${Math.round(n / 1000)}K`);
const ALERT = { price_changed: "Price changed", off_market: "Off market" } as const;

/**
 * Opportunities the client saved from /invest, with status Watching: the numbers as of the day they were saved,
 * the daily run's alerts, and the next steps (feasibility, plans that fit, drawing the DADU) with the parcel filled in.
 */
export default function WatchingList({ rows }: { rows: WatchRow[] }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="db-watch-h" className="db-watch">
      <h2 id="db-watch-h" className="pa-display text-xl" style={{ color: "var(--ink)" }}>Watching</h2>
      <ul className="db-grid">
        {rows.map((r) => {
          const s = r.snapshot ?? {};
          const parcel = r.parcel_pin ? `?parcel=${r.parcel_pin}` : "";
          return (
            <li key={r.id} className="db-card">
              <div className="db-watch-top">
                <p className="db-addr">{prettyAddress(r.address) || "Saved property"}</p>
                <span className="db-watch-status">{r.alert ? ALERT[r.alert] : "Watching"}</span>
              </div>
              <ul className="db-watch-stats">
                {s.price != null && <li><b>{usdK(s.price)}</b> list price</li>}
                {s.cash_required != null && <li><b>{usdK(s.cash_required)}</b> cash required</li>}
                {s.dadu_sqft != null && <li><b>{s.dadu_sqft.toLocaleString("en-US")} sf</b> DADU</li>}
              </ul>
              {s.as_of && <p className="db-pin">Numbers as of {s.as_of}</p>}
              <Link href={`/invest/${encodeURIComponent(r.listing_id)}`} className="pa-btn pa-btn-primary db-next no-underline">View analysis <ArrowRight size={15} aria-hidden /></Link>
              <p className="db-links">
                <Link href={`/feasibility${parcel}`}>Start feasibility</Link>
                <Link href={`/plans${parcel}`}>Browse plans that fit</Link>
                <Link href={`/feasibility${parcel}#rep-plan`}>Draw my DADU</Link>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
