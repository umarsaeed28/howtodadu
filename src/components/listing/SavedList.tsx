"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Download, Heart, Trash2 } from "lucide-react";
import { useSavedListings, type SavedListing } from "@/hooks/useSavedListings";
import { downloadSavedCsv } from "@/lib/listings-csv";
import type { MapListing } from "@/app/api/map-listings/route";
import { gradeOf } from "@/lib/dadu-score";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const GRADE_COLOR = ["#8A8574", "#9A6F12", "#2E7D55", "#145A40"];

/** The saved-homes list: every home and lot the visitor saved this session, with links and a CSV download. */
export default function SavedList() {
  const { saved, toggle } = useSavedListings();
  const [live, setLive] = useState<MapListing[]>([]);
  // Live listings refresh price, status and the pending tag; the saved copy is the fallback.
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/map-listings", { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => setLive((d.listings ?? []) as MapListing[]))
      .catch(() => {});
    return () => ctl.abort();
  }, []);
  const byId = new Map(live.map((l) => [l.mlsId, l]));

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-16 pt-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pa-display text-3xl" style={{ color: "var(--ink)" }}>Saved homes</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
            {saved.length === 0 ? "Nothing saved yet." : `${saved.length} saved${saved.some((s) => s.market === "off") ? ` · ${saved.filter((s) => s.market === "off").length} off market` : ""}. Kept for this browser session.`}
          </p>
        </div>
        <button type="button" className="pa-btn" onClick={() => downloadSavedCsv(saved, live)} disabled={!saved.length}>
          <Download size={15} aria-hidden /> Download CSV
        </button>
      </div>

      {saved.length === 0 ? (
        <div className="pa-raised mt-6 p-6 text-sm" style={{ color: "var(--ink)" }}>
          <p>Tap the <Heart size={14} className="inline" aria-label="heart" /> on any home on the map, in a lot&apos;s panel or on a listing page to keep it here.</p>
          <Link href="/" className="pa-btn pa-btn-primary mt-4 inline-flex no-underline">Open the map <ArrowRight size={15} aria-hidden /></Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {saved.map((s) => (
            <Row key={s.mlsId} s={s} live={byId.get(s.mlsId) ?? null} onRemove={() => toggle(s)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ s, live, onRemove }: { s: SavedListing; live: MapListing | null; onRemove: () => void }) {
  const off = s.market === "off";
  const score = live?.score ?? s.score;
  const tier = live?.tier ?? s.tier ?? gradeOf(score).tier;
  const grade = gradeOf(score).label;
  const street = s.address.split(",")[0];
  const report = `/feasibility?address=${encodeURIComponent(`${street}, Seattle, WA`)}`;
  const listingHref = off ? report : `/listing/${encodeURIComponent(s.mlsId)}`;
  const photo = live?.photo ?? s.photo;
  return (
    <li className="pa-raised flex items-center gap-4 p-3 sm:p-4">
      <Link href={listingHref} className="block h-20 w-28 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--green-tint)" }} aria-label={`Open ${street}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="pa-display flex h-full w-full items-center justify-center text-2xl tabular-nums" style={{ color: GRADE_COLOR[tier] }}>{score}</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={listingHref} className="pa-display truncate text-lg no-underline" style={{ color: "var(--ink)" }}>{street}</Link>
          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: GRADE_COLOR[tier] }}>{grade} · {score}</span>
          {off ? (
            <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(23,36,29,.08)", color: "var(--ink)" }}>Off market</span>
          ) : live?.pending ? (
            <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "#FFF4D6", color: "#7A5A12" }}>Pending</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm tabular-nums" style={{ color: "var(--slate)" }}>
          {off ? "Not for sale" : usd(live?.price ?? s.price)}
          {(live?.lotSqft ?? s.lotSqft) ? ` · ${(live?.lotSqft ?? s.lotSqft)!.toLocaleString()} sf lot` : ""}
          {(live?.daduSqft ?? s.daduSqft) ? ` · DADU up to ${Math.round((live?.daduSqft ?? s.daduSqft)!).toLocaleString()} sf` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {!off && <Link href={listingHref} className="font-semibold no-underline" style={{ color: "var(--green)" }}>Listing</Link>}
          <Link href={report} className="font-semibold no-underline" style={{ color: "var(--green)" }}>Full report</Link>
        </div>
      </div>
      <button type="button" onClick={onRemove} className="pa-btn pa-btn-sm shrink-0" aria-label={`Remove ${street} from saved homes`}>
        <Trash2 size={14} aria-hidden /> <span className="hidden sm:inline">Remove</span>
      </button>
    </li>
  );
}
