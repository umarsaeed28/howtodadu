"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, AlertTriangle, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import { verdictFromScore, feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";
import VerdictPill from "@/components/pencil-app/VerdictPill";

const VERDICT_COLOR = {
  PENCILS: "var(--green)",
  TIGHT: "var(--amber)",
  NO: "var(--red)",
} as const;

export default function FeasCard({
  slim,
  favorite,
  onToggleFavorite,
  onOpen,
}: {
  slim: DashboardPropertySlim;
  favorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  const [imgErrored, setImgErrored] = useState(false);

  if (slim.status === "failed") {
    return (
      <div className="pa-card overflow-hidden p-4">
        <div className="flex items-center gap-2" style={{ color: "var(--red)" }}>
          <AlertTriangle size={16} aria-hidden />
          <span className="pa-mono text-sm">Could not analyze</span>
        </div>
        <p className="pa-mono mt-2 text-sm" style={{ color: "var(--ink)" }}>
          {slim.streetLine}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
          {slim.errorMessage ?? "No data returned for this address."}
        </p>
      </div>
    );
  }

  const verdict = verdictFromScore(slim.daduScore);
  const scoreColor = VERDICT_COLOR[verdict];
  const lot = slim.lotSizeSqft ? `${slim.lotSizeSqft.toLocaleString()} sq ft lot` : null;
  const primarySrc = feasPhoto(slim.address, slim.lat, slim.lng);
  const fallbackSrc = feasPhoto(slim.address);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="pa-card group block cursor-pointer overflow-hidden text-left transition-transform hover:-translate-y-0.5"
      aria-label={`View analysis for ${slim.address}`}
    >
      <div className="relative aspect-[3/2]" style={{ background: "var(--paper)" }}>
        <Image
          src={imgErrored ? fallbackSrc : primarySrc}
          alt={`${slim.streetLine}, ${slim.neighborhood}`}
          fill
          sizes="(max-width:768px) 100vw, 360px"
          className="object-cover"
          unoptimized
          onError={() => setImgErrored(true)}
        />
        <div className="absolute left-2 top-2">
          <VerdictPill verdict={verdict} size="md" />
        </div>
        <button
          type="button"
          aria-label={favorite ? "Remove from saved" : "Save property"}
          aria-pressed={favorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "var(--card)", boxShadow: "var(--shadow-raised)" }}
        >
          <Heart
            size={17}
            aria-hidden
            fill={favorite ? "var(--green)" : "none"}
            color={favorite ? "var(--green)" : "var(--ink)"}
          />
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="pa-mono text-2xl font-medium leading-none" style={{ color: scoreColor }}>
            {slim.daduScore}
            <span className="text-sm" style={{ color: "var(--slate)" }}>
              {" "}
              / 100
            </span>
          </span>
          <span className="pa-mono text-sm" style={{ color: "var(--ink)" }}>
            {slim.priceDisplay}
          </span>
        </div>

        <p className="pa-mono mt-2 text-xs" style={{ color: "var(--slate)" }}>
          {slim.zoning ?? "Zoning n/a"}
          {lot ? ` · ${lot}` : ""}
        </p>

        <p className="pa-mono mt-2 text-sm leading-snug" style={{ color: "var(--ink)" }}>
          {slim.streetLine}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-xs" style={{ color: "var(--slate)" }}>
            {slim.neighborhood} · {slim.confidenceShort} confidence
          </p>
          <a
            href={zillowUrl(slim.address)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex shrink-0 items-center gap-1 text-xs no-underline hover:underline"
            style={{ color: "var(--green)" }}
          >
            Zillow
            <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
