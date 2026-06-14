"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ExternalLink } from "lucide-react";
import type { Parcel } from "@/lib/parcels";
import { zillowUrl } from "@/lib/parcels";
import { usdM, pct } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import VerdictPill from "./VerdictPill";

export default function ParcelCard({ parcel }: { parcel: Parcel }) {
  const hoveredId = useAppStore((s) => s.hoveredId);
  const setHovered = useAppStore((s) => s.setHovered);
  const saved = useAppStore((s) => s.saved.includes(parcel.id));
  const toggleSaved = useAppStore((s) => s.toggleSaved);

  const active = hoveredId === parcel.id;

  return (
    <Link
      href={`/app/parcel/${parcel.id}`}
      className="pa-card group block overflow-hidden transition-transform"
      style={{
        borderColor: active ? "rgba(29,31,34,0.28)" : undefined,
        transform: active ? "translateY(-2px)" : undefined,
        boxShadow: active ? "var(--shadow-pop)" : "var(--shadow-raised)",
      }}
      onMouseEnter={() => setHovered(parcel.id)}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="relative aspect-[3/2] bg-[var(--paper)]">
        <Image
          src={parcel.photo}
          alt={`${parcel.address}, ${parcel.neighborhood}`}
          fill
          sizes="(max-width:768px) 100vw, 360px"
          className="object-cover"
          unoptimized
        />
        <div className="absolute left-2 top-2">
          <VerdictPill verdict={parcel.verdict} size="md" />
        </div>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save parcel"}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            toggleSaved(parcel.id);
          }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card)]"
          style={{ boxShadow: "var(--shadow-raised)" }}
        >
          <Heart
            size={17}
            aria-hidden
            fill={saved ? "var(--green)" : "none"}
            color={saved ? "var(--green)" : "var(--ink)"}
          />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="pa-mono text-2xl font-medium leading-none"
            style={{ color: "var(--green)" }}
          >
            {pct(parcel.marginPct)}
          </span>
          <span className="pa-mono text-sm" style={{ color: "var(--ink)" }}>
            {usdM(parcel.listPrice)}
          </span>
        </div>

        <p className="pa-mono mt-2 text-xs" style={{ color: "var(--slate)" }}>
          {parcel.unitsUnlocked} units · {parcel.zoning} · all-in {usdM(parcel.allInCost)}
        </p>

        <p className="pa-mono mt-2 text-sm leading-snug" style={{ color: "var(--ink)" }}>
          {parcel.address}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-xs" style={{ color: "var(--slate)" }}>
            {parcel.neighborhood}
            {parcel.nearTransit ? " · near transit" : ""}
          </p>
          <a
            href={zillowUrl(`${parcel.address}, ${parcel.neighborhood}, Seattle, WA`)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(
                zillowUrl(`${parcel.address}, ${parcel.neighborhood}, Seattle, WA`),
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className="inline-flex shrink-0 items-center gap-1 text-xs no-underline hover:underline"
            style={{ color: "var(--green)" }}
          >
            Zillow
            <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      </div>
    </Link>
  );
}
