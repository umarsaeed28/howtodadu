"use client";

import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { buildFeasibilityOverviewGroups, parcelViewerUrl } from "@/lib/feasibility-ui-rows";
import { buildRiskLines, buildWhyBullets } from "@/lib/feasibility-table-model";
import { Loader2, ExternalLink } from "lucide-react";

/**
 * De-duplicated property facts for the feasibility detail page, styled with the
 * pencil-app tokens. Verdict, score, address, save and Zillow already live in the
 * panel header, and lot/zoning/FAR live in the key-facts strip, so this section
 * drops the old "Property" group and renders only geometry, constraints,
 * structures, the strengths, and the risks to verify.
 */
export default function FeasPropertyDetails({
  slim,
  detailRow,
  loading,
  error,
}: {
  slim: DashboardPropertySlim;
  detailRow: FeasibilityTableRow | null;
  loading: boolean;
  error: string | null;
}) {
  if (slim.status === "failed") {
    return (
      <p className="px-4 pb-5 text-sm sm:px-5" style={{ color: "var(--slate)" }}>
        {slim.errorMessage ?? slim.summarySentence}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 sm:px-5" style={{ color: "var(--slate)" }}>
        <Loader2 size={15} className="animate-spin" aria-hidden />
        <span className="text-sm">Loading property details…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="px-4 py-6 text-sm sm:px-5" style={{ color: "var(--red)" }}>
        {error}
      </p>
    );
  }

  if (!detailRow) return null;

  const groups = buildFeasibilityOverviewGroups(detailRow.result, detailRow.report).filter(
    (g) => g.id !== "property"
  );
  const why = buildWhyBullets(detailRow.report, detailRow.signals);
  const risks = buildRiskLines(detailRow.signals, detailRow.report);
  const parcelUrl = parcelViewerUrl(detailRow.result.parcel?.pin);

  function toneColor(tone?: "good" | "caution" | "severe") {
    if (tone === "good") return "var(--green)";
    if (tone === "caution") return "var(--amber)";
    if (tone === "severe") return "var(--red)";
    return "var(--ink)";
  }

  return (
    <div className="space-y-6 px-4 pb-6 pt-2 sm:px-5">
      {/* Fact tables */}
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.title}>
            <h4 className="pa-eyebrow mb-2" style={{ color: "var(--slate)" }}>
              {g.title}
            </h4>
            <dl
              className="overflow-hidden rounded-[10px] border"
              style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
            >
              {g.rows.map((r, i) => (
                <div
                  key={r.label}
                  className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-sm"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--hairline)",
                  }}
                >
                  <dt style={{ color: "var(--slate)" }}>{r.label}</dt>
                  <dd
                    className="pa-mono text-right font-medium"
                    style={{ color: toneColor(r.valueTone), maxWidth: "60%" }}
                  >
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {/* Why this read */}
      {why.length > 0 && (
        <section aria-label="Why this read">
          <h4 className="pa-eyebrow mb-2" style={{ color: "var(--slate)" }}>
            Why this read
          </h4>
          <ul className="space-y-2">
            {why.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                <span aria-hidden style={{ color: "var(--green)", marginTop: 1 }}>
                  •
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Risks to verify */}
      {risks.length > 0 && (
        <section aria-label="Risks to verify">
          <h4 className="pa-eyebrow mb-2" style={{ color: "var(--slate)" }}>
            Risks to verify
          </h4>
          <ul className="space-y-2">
            {risks.map((r) => (
              <li key={r} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                <span aria-hidden style={{ color: "var(--amber)", marginTop: 1 }}>
                  •
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {parcelUrl && (
        <a
          href={parcelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pa-btn pa-btn-sm no-underline"
        >
          County assessor record
          <ExternalLink size={14} aria-hidden />
        </a>
      )}

      <p className="text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
        Preliminary read from Seattle City GIS layers. Not a final determination, legal advice, or a
        permit approval. We confirm everything before any acquisition.
      </p>
    </div>
  );
}
