"use client";

import { ExternalLink } from "lucide-react";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { buildWhatsAllowed } from "@/lib/feasibility/whats-allowed";

export default function FeasWhatsAllowed({ detailRow }: { detailRow: FeasibilityTableRow }) {
  const allowed = buildWhatsAllowed(detailRow.result, detailRow.report);

  return (
    <section aria-labelledby="whats-allowed-heading" className="px-4 pt-5 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 id="whats-allowed-heading" className="pa-display text-base" style={{ color: "var(--ink)" }}>
          What&apos;s allowed
        </h3>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: "var(--green-tint)", color: "var(--green)" }}
        >
          High confidence · rules-based
        </span>
      </div>

      <div
        className="overflow-hidden rounded-[10px] border"
        style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
      >
        <dl>
          <FactRow label="Zoning" value={allowed.zone} />
          <FactRow label="Max homes (est.)" value={allowed.maxUnits} note={allowed.transitNote} />
          <FactRow
            label="Allowed housing types"
            value={allowed.housingTypes.length > 0 ? allowed.housingTypes.join(" · ") : "—"}
          />
          {allowed.envelope.map((f) => (
            <FactRow key={f.label} label={f.label} value={f.value} note={f.note} />
          ))}
        </dl>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {allowed.citations.map((c) => (
          <a
            key={c.href}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs no-underline hover:underline"
            style={{ color: "var(--green)" }}
          >
            {c.label}
            <ExternalLink size={12} aria-hidden />
          </a>
        ))}
      </div>
    </section>
  );
}

function FactRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div
      className="grid gap-1 border-b px-3.5 py-3 last:border-b-0 sm:grid-cols-[1fr_1.2fr]"
      style={{ borderColor: "var(--hairline)" }}
    >
      <dt className="text-sm" style={{ color: "var(--slate)" }}>
        {label}
      </dt>
      <dd>
        <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {value}
        </p>
        {note ? (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
            {note}
          </p>
        ) : null}
      </dd>
    </div>
  );
}
