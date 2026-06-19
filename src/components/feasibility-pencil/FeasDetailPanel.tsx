"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Heart, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import FeasPropertyDetails from "./FeasPropertyDetails";
import { verdictFromScore, feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";
import VerdictPill from "@/components/pencil-app/VerdictPill";
import AssumptionsPanel from "@/components/inputs/AssumptionsPanel";
import { slimToDealInputs } from "@/lib/feasibility/defaults";
import { computeFar, maxFarForZone } from "@/lib/feasibility/far";

function sqft(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString()} sq ft`;
}

function FactTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-[10px] border px-3.5 py-3"
      style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
    >
      <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
        {label}
      </p>
      <p
        className="pa-mono mt-1 text-base font-medium"
        style={{ color: accent ? "var(--green)" : "var(--ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function FeasDetailPanel({
  slim,
  detailRow,
  loading,
  error,
  favorite,
  onToggleFavorite,
  onBack,
}: {
  slim: DashboardPropertySlim;
  detailRow: FeasibilityTableRow | null;
  loading: boolean;
  error: string | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}) {
  const [imgErrored, setImgErrored] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onBack();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const verdict = slim.status === "analyzed" ? verdictFromScore(slim.daduScore) : null;
  const analyzed = slim.status === "analyzed";
  const photoSrc = imgErrored
    ? feasPhoto(slim.address)
    : feasPhoto(slim.address, slim.lat, slim.lng);

  const dealInputs = analyzed ? slimToDealInputs(slim) : null;
  const existingFar = computeFar(slim.interiorSqftNum, slim.lotSizeSqft);
  const maxFar = maxFarForZone(slim.zoning);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button type="button" className="pa-btn pa-btn-sm mb-4" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden />
        Back to results
      </button>

      <div
        className="overflow-hidden rounded-[14px] border"
        style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
      >
        {/* Hero photo with verdict overlay */}
        {analyzed && (
          <div className="relative aspect-[16/9] w-full" style={{ background: "var(--paper)" }}>
            <Image
              src={photoSrc}
              alt={`${slim.streetLine}, ${slim.neighborhood}`}
              fill
              sizes="(max-width:768px) 100vw, 768px"
              className="object-cover"
              unoptimized
              onError={() => setImgErrored(true)}
            />
            {verdict && (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <VerdictPill verdict={verdict} size="md" />
                <span
                  className="pa-mono rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.92)", color: "var(--ink)" }}
                >
                  Score {slim.daduScore}/100
                </span>
              </div>
            )}
          </div>
        )}

        {/* Address + actions */}
        <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="pa-display text-xl" style={{ color: "var(--ink)" }}>
              {slim.streetLine}
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--slate)" }}>
              {slim.neighborhood}
              {slim.zoning ? ` · ${slim.zoning}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={zillowUrl(slim.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="pa-btn pa-btn-sm no-underline"
            >
              Zillow
              <ExternalLink size={14} aria-hidden />
            </a>
            <button
              type="button"
              className="pa-btn pa-btn-sm"
              aria-pressed={favorite}
              onClick={onToggleFavorite}
            >
              <Heart
                size={15}
                aria-hidden
                fill={favorite ? "var(--green)" : "none"}
                color={favorite ? "var(--green)" : "var(--ink)"}
              />
              {favorite ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {analyzed && (
          <p className="mt-2 px-4 text-sm leading-relaxed sm:px-5" style={{ color: "var(--slate)" }}>
            {slim.summarySentence}
          </p>
        )}

        {/* Key facts strip — Zillow style */}
        {analyzed && (
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 sm:grid-cols-3 sm:px-5">
            <FactTile label="Lot size" value={sqft(slim.lotSizeSqft)} />
            <FactTile label="Building area" value={sqft(slim.interiorSqftNum)} />
            <FactTile label="Units allowed (est.)" value={dealInputs ? `${dealInputs.units}` : "—"} />
            <FactTile label="Existing FAR" value={existingFar.display} />
            <FactTile
              label="Max FAR (est.)"
              value={maxFar != null ? maxFar.toFixed(2) : "—"}
            />
            <FactTile label="Assessed value" value={slim.priceDisplay} />
          </div>
        )}

        {/* Model the deal */}
        {analyzed && dealInputs && (
          <section aria-labelledby="model-deal-heading" className="px-4 pt-6 sm:px-5">
            <h3 id="model-deal-heading" className="pa-display mb-3 text-base" style={{ color: "var(--ink)" }}>
              Model the deal
            </h3>
            <AssumptionsPanel
              dealId={`feas-${slim.id}`}
              initialInputs={dealInputs}
              neighborhood={slim.neighborhood}
              lotSqft={slim.lotSizeSqft}
              zoning={slim.zoning}
            />
          </section>
        )}

        {/* Property details */}
        <section aria-labelledby="property-details-heading" className="pt-6">
          <h3
            id="property-details-heading"
            className="pa-display px-4 text-base sm:px-5"
            style={{ color: "var(--ink)" }}
          >
            Property details
          </h3>
          <FeasPropertyDetails
            slim={slim}
            detailRow={detailRow}
            loading={loading}
            error={error}
          />
        </section>
      </div>
    </div>
  );
}
