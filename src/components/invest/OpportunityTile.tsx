"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { Opportunity } from "@/lib/invest/opportunity";
import { track } from "@/lib/analytics";
import { sourceLabel, usd, usdShort } from "./format";
import WatchButton from "./WatchButton";

/**
 * An opportunity tile: photo, price and address, the four numbers that decide it, one line on why the lot works,
 * and the listing attribution the feed rules require.
 */
export default function OpportunityTile({ o, position, source, signedIn, watched, from = "invest" }: { o: Opportunity; position: number; source: string; signedIn?: boolean; watched: boolean; from?: "invest" | "home" }) {
  const [photoOk, setPhotoOk] = useState(!!o.photo);
  const href = `/invest/${encodeURIComponent(o.id)}`;
  return (
    <li className="iv-tile">
      <Link href={href} className="iv-tile-link" onClick={() => track("tile_clicked", { listing_id: o.id, position, source: from })}>
        <span className="iv-photo">
          {photoOk && o.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.photo} alt="" loading="lazy" onError={() => setPhotoOk(false)} />
          ) : (
            <svg viewBox="0 0 160 100" aria-hidden>
              <rect x="20" y="14" width="120" height="72" rx="3" fill="none" stroke="var(--green)" strokeOpacity="0.5" strokeWidth="1.5" />
              <path d="M44 62 L44 40 L60 28 L76 40 L76 62 Z" fill="var(--green)" fillOpacity="0.15" stroke="var(--green)" strokeOpacity="0.6" strokeWidth="1.5" />
              <rect x="98" y="24" width="26" height="22" rx="1.5" fill="#E6C97E" stroke="#17241D" strokeOpacity="0.6" strokeWidth="1.2" />
            </svg>
          )}
          {(o.topPick || o.newToday) && (
            <span className="iv-badges">
              {o.topPick && <span className="iv-badge iv-badge--pick"><Star size={11} aria-hidden fill="currentColor" /> Top Pick</span>}
              {o.newToday && <span className="iv-badge">New today</span>}
            </span>
          )}
        </span>
        <span className="iv-body">
          <span className="iv-price">{usd(o.price)}</span>
          <span className="iv-addr">{o.area} · {o.street}</span>
          <span className="iv-stats">
            <span><b>{o.score}</b> <i>DADU score</i></span>
            <span><b>{o.daduSqft.toLocaleString("en-US")} sf</b> <i>DADU potential</i></span>
            <span><b>{usdShort(o.u.cashRequired)}</b> <i>cash required</i></span>
            <span><b>{usdShort(o.u.totalProjectCost)}</b> <i>all-in cost</i></span>
          </span>
          <span className="iv-insight">{o.insight}</span>
        </span>
      </Link>
      <span className="iv-actions">
        <Link href={href} className="pa-btn pa-btn-sm pa-btn-primary" onClick={() => track("tile_clicked", { listing_id: o.id, position, source: from })}>View analysis</Link>
        <WatchButton listingId={o.id} signedIn={signedIn} watched={watched} size="sm" />
      </span>
      <span className="iv-foot">
        {o.brokerage ? `Listing courtesy of ${o.brokerage}. ` : `Listing data: ${sourceLabel(source)}. `}Estimates only. Not investment advice.
      </span>
    </li>
  );
}
