"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_FILTERS, filterOpportunities, TOP_PICKS, type InvestFilters, type Opportunity, type SortKey } from "@/lib/invest/opportunity";
import { track } from "@/lib/analytics";
import OpportunityTile from "./OpportunityTile";
import { usdShort } from "./format";

const PRICES = [600_000, 800_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000, 3_000_000];
const CASH = [250_000, 350_000, 450_000, 550_000, 700_000];
const SORTS: { k: SortKey; label: string }[] = [
  { k: "score", label: "Best DADU score" },
  { k: "cash", label: "Lowest cash required" },
  { k: "newest", label: "Newest" },
];

const num = (v: string) => (v === "" ? null : Number(v));

/** The filter bar and the grid of tiles. Filtering runs in the browser: the feed is one day's list, at most a few hundred. */
export default function InvestFeed({ opportunities, source, signedIn, watched }: { opportunities: Opportunity[]; source: string; signedIn: boolean; watched: string[] }) {
  const [f, setF] = useState<InvestFilters>(DEFAULT_FILTERS);
  const areas = useMemo(() => [...new Set(opportunities.map((o) => o.area))].sort(), [opportunities]);
  // Only the five best matches show; the filters change which five.
  const matches = useMemo(() => filterOpportunities(opportunities, f), [opportunities, f]);
  const shown = matches.slice(0, TOP_PICKS);
  const watchedSet = useMemo(() => new Set(watched), [watched]);

  useEffect(() => track("invest_page_viewed", { count: opportunities.length }), [opportunities.length]);

  const set = <K extends keyof InvestFilters>(k: K, v: InvestFilters[K]) => {
    track("filter_used", { filter: k });
    setF((x) => ({ ...x, [k]: v }));
  };

  return (
    <>
      <div className="iv-filters" role="group" aria-label="Filter opportunities">
        <label className="iv-select">
          <span className="sr-only">Neighborhood</span>
          <select value={f.area ?? ""} onChange={(e) => set("area", e.target.value || null)}>
            <option value="">All neighborhoods</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="iv-select">
          <span className="sr-only">Lowest price</span>
          <select value={f.minPrice ?? ""} onChange={(e) => set("minPrice", num(e.target.value))}>
            <option value="">Min price</option>
            {PRICES.map((p) => <option key={p} value={p}>{usdShort(p)}+</option>)}
          </select>
        </label>
        <label className="iv-select">
          <span className="sr-only">Highest price</span>
          <select value={f.maxPrice ?? ""} onChange={(e) => set("maxPrice", num(e.target.value))}>
            <option value="">Max price</option>
            {PRICES.map((p) => <option key={p} value={p}>Up to {usdShort(p)}</option>)}
          </select>
        </label>
        <label className="iv-select">
          <span className="sr-only">Most cash required</span>
          <select value={f.maxCash ?? ""} onChange={(e) => set("maxCash", num(e.target.value))}>
            <option value="">Max cash required</option>
            {CASH.map((p) => <option key={p} value={p}>Up to {usdShort(p)} cash</option>)}
          </select>
        </label>
        <label className="iv-select">
          <span className="sr-only">Sort</span>
          <select value={f.sort} onChange={(e) => set("sort", e.target.value as SortKey)}>
            {SORTS.map((s) => <option key={s.k} value={s.k}>Sort: {s.label}</option>)}
          </select>
        </label>
      </div>

      <p className="iv-count">{matches.length > shown.length ? `The top ${shown.length} of ${matches.length} matching opportunities` : `${shown.length} matching ${shown.length === 1 ? "opportunity" : "opportunities"}`}</p>
      {shown.length ? (
        <ul className="iv-grid">
          {shown.map((o, i) => <OpportunityTile key={o.id} o={o} position={i + 1} source={source} signedIn={signedIn} watched={watchedSet.has(o.id)} />)}
        </ul>
      ) : (
        <p className="iv-empty">{opportunities.length ? "No opportunities match. Widen the price range or clear a filter." : "No listings in the feed right now. Check back after the next daily run."}</p>
      )}
    </>
  );
}
