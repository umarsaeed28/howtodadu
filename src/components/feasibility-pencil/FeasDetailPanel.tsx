"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Heart, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import FeasPropertyDetails from "./FeasPropertyDetails";
import FeasWhatsAllowed from "./FeasWhatsAllowed";
import FeasBuildGuides from "./FeasBuildGuides";
import SitePlanGenerator from "./SitePlanGenerator";
import FeasCodeRulesPanel from "./FeasCodeRulesPanel";
import { feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";
import AssumptionsPanel from "@/components/inputs/AssumptionsPanel";
import { slimToDealInputs } from "@/lib/feasibility/defaults";
import { computeFar, maxFarForZone } from "@/lib/feasibility/far";

function sqft(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString()} sq ft`;
}

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[10px] border px-3.5 py-3"
      style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
    >
      <p className="pa-eyebrow" style={{ color: "var(--slate)" }}>
        {label}
      </p>
      <p className="pa-mono mt-1 text-base font-medium" style={{ color: "var(--ink)" }}>
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
  const [costsOpen, setCostsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onBack();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const analyzed = slim.status === "analyzed";
  const photoSrc = imgErrored
    ? feasPhoto(slim.address)
    : feasPhoto(slim.address, slim.lat, slim.lng);

  const dealInputs = analyzed ? slimToDealInputs(slim) : null;
  const existingFar = computeFar(slim.interiorSqftNum, slim.lotSizeSqft);
  const maxFar = maxFarForZone(slim.zoning);
  const buildOptionCount =
    detailRow?.report.housingOptions.filter((o) => o.allowed).length ?? null;

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
            {buildOptionCount != null && buildOptionCount > 0 && (
              <span
                className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.92)", color: "var(--ink)" }}
              >
                {buildOptionCount} build {buildOptionCount === 1 ? "option" : "options"}
              </span>
            )}
          </div>
        )}

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

        {analyzed && (
          <div className="grid grid-cols-2 gap-2.5 px-4 pt-4 sm:grid-cols-3 sm:px-5">
            <FactTile label="Lot size" value={sqft(slim.lotSizeSqft)} />
            <FactTile label="Building area" value={sqft(slim.interiorSqftNum)} />
            <FactTile label="Build options" value={buildOptionCount != null ? `${buildOptionCount}` : "—"} />
            <FactTile label="Existing FAR" value={existingFar.display} />
            <FactTile label="Max FAR (est.)" value={maxFar != null ? maxFar.toFixed(2) : "—"} />
            <FactTile label="Assessed value" value={slim.priceDisplay} />
          </div>
        )}

        {detailRow && !loading && !error && (
          <>
            <SitePlanGenerator
              result={detailRow.result}
              report={detailRow.report}
              address={slim.address}
            />
            <FeasCodeRulesPanel result={detailRow.result} report={detailRow.report} />
            <FeasWhatsAllowed detailRow={detailRow} />
            <FeasBuildGuides detailRow={detailRow} />
          </>
        )}

        {analyzed && dealInputs && (
          <section aria-labelledby="model-costs-heading" className="px-4 pt-6 sm:px-5">
            <button
              type="button"
              id="model-costs-heading"
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={costsOpen}
              onClick={() => setCostsOpen((o) => !o)}
            >
              <span className="pa-display text-base" style={{ color: "var(--ink)" }}>
                Model costs (optional)
              </span>
              {costsOpen ? (
                <ChevronUp size={18} aria-hidden style={{ color: "var(--slate)" }} />
              ) : (
                <ChevronDown size={18} aria-hidden style={{ color: "var(--slate)" }} />
              )}
            </button>
            <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
              Adjust assumptions for a planning-level cost read. Not a final underwriting.
            </p>
            {costsOpen && (
              <div className="mt-4">
                <AssumptionsPanel
                  dealId={`feas-${slim.id}`}
                  initialInputs={dealInputs}
                  neighborhood={slim.neighborhood}
                  lotSqft={slim.lotSizeSqft}
                  zoning={slim.zoning}
                />
              </div>
            )}
          </section>
        )}

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
