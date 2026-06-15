"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Heart, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { ExpandablePropertyDetails } from "@/components/dashboard/ExpandablePropertyDetails";
import { verdictFromScore, feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";
import VerdictPill from "@/components/pencil-app/VerdictPill";
import AssumptionsPanel from "@/components/inputs/AssumptionsPanel";
import { slimToDealInputs } from "@/lib/feasibility/defaults";

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
  const showPhoto = slim.status === "analyzed";
  const photoSrc = imgErrored
    ? feasPhoto(slim.address)
    : feasPhoto(slim.address, slim.lat, slim.lng);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        className="pa-btn pa-btn-sm mb-4"
        onClick={onBack}
      >
        <ArrowLeft size={15} aria-hidden />
        Back to results
      </button>

      <div
        className="overflow-hidden rounded-[12px] border"
        style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
      >
        <div
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {verdict && <VerdictPill verdict={verdict} size="md" />}
              {slim.status === "analyzed" && (
                <span className="pa-mono text-sm" style={{ color: "var(--slate)" }}>
                  Score {slim.daduScore} / 100
                </span>
              )}
            </div>
            <h2 className="pa-display mt-1.5 truncate text-lg" style={{ color: "var(--ink)" }}>
              {slim.streetLine}
            </h2>
            <p className="truncate text-xs" style={{ color: "var(--slate)" }}>
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

        <div style={{ background: "var(--paper)" }}>
          {showPhoto && (
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
            </div>
          )}
          {slim.status === "analyzed" && (
            <section aria-labelledby="model-deal-heading" className="px-4 pt-4 sm:px-5">
              <h3 id="model-deal-heading" className="pa-display mb-3 text-base" style={{ color: "var(--ink)" }}>
                Model the deal
              </h3>
              <AssumptionsPanel
                dealId={`feas-${slim.id}`}
                initialInputs={slimToDealInputs(slim)}
                neighborhood={slim.neighborhood}
              />
            </section>
          )}

          <ExpandablePropertyDetails
            slim={slim}
            detailRow={detailRow}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
