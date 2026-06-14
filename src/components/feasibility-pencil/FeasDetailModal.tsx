"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, Heart, ExternalLink } from "lucide-react";
import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { ExpandablePropertyDetails } from "@/components/dashboard/ExpandablePropertyDetails";
import { verdictFromScore, feasPhoto, zillowUrl } from "@/lib/feasibility-verdict";
import VerdictPill from "@/components/pencil-app/VerdictPill";

export default function FeasDetailModal({
  slim,
  detailRow,
  loading,
  error,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  slim: DashboardPropertySlim;
  detailRow: FeasibilityTableRow | null;
  loading: boolean;
  error: string | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [imgErrored, setImgErrored] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const verdict = slim.status === "analyzed" ? verdictFromScore(slim.daduScore) : null;
  const showPhoto = slim.status === "analyzed";
  const photoSrc = imgErrored
    ? feasPhoto(slim.address)
    : feasPhoto(slim.address, slim.lat, slim.lng);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(29,31,34,0.45)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Analysis for ${slim.address}`}
        className="pa-scroll flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[12px] sm:rounded-[12px]"
        style={{ background: "var(--card)", boxShadow: "var(--shadow-pop)" }}
        onClick={(e) => e.stopPropagation()}
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
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ border: "1px solid var(--hairline)", background: "var(--card)" }}
              onClick={onClose}
            >
              <X size={17} aria-hidden />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto pa-scroll" style={{ background: "var(--paper)" }}>
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
