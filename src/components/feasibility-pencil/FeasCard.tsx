"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, AlertTriangle, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import { feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";

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
        <span
          className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--ink)" }}
        >
          {slim.verdictLabel}
        </span>
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
        <p className="pa-mono text-sm leading-snug" style={{ color: "var(--ink)" }}>
          {slim.streetLine}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
          {slim.neighborhood}
          {slim.zoning ? ` · ${slim.zoning}` : ""}
          {lot ? ` · ${lot}` : ""}
        </p>
        <p className="mt-2 text-sm leading-snug" style={{ color: "var(--slate)" }}>
          {slim.keyInsight}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "var(--slate)" }}>
            {slim.confidenceShort} confidence
          </span>
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
