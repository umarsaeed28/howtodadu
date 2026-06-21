"use client";

import { ExternalLink } from "lucide-react";
import type { FeasibilityResult } from "@/lib/feasibility";
import type { ADUReport } from "@/lib/adu-analysis";
import {
  buildCodeRules,
  RULESET_EFFECTIVE,
  RULESET_VERSION,
  type RuleConfidence,
} from "@/lib/site-plan/ruleset";

const CONFIDENCE_LABEL: Record<RuleConfidence, string> = {
  verified: "Verified · GIS",
  derived: "Derived · ruleset",
  unverified: "Unverified",
};

const CONFIDENCE_STYLE: Record<RuleConfidence, { bg: string; color: string }> = {
  verified: { bg: "var(--green-tint)", color: "var(--green)" },
  derived: { bg: "rgba(245, 158, 11, 0.12)", color: "var(--amber)" },
  unverified: { bg: "var(--paper)", color: "var(--slate)" },
};

export default function FeasCodeRulesPanel({
  result,
  report,
}: {
  result: FeasibilityResult;
  report: ADUReport;
}) {
  const rules = buildCodeRules(result, report);

  return (
    <section aria-labelledby="code-rules-heading" className="px-4 pt-6 sm:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="code-rules-heading" className="pa-display text-base" style={{ color: "var(--ink)" }}>
            Code & envelope
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--slate)" }}>
            Ruleset {RULESET_VERSION} · effective {RULESET_EFFECTIVE}
          </p>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[10px] border"
        style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
      >
        <ul>
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="border-b px-3.5 py-3 last:border-b-0"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: "var(--slate)" }}>
                    {rule.label}
                  </p>
                  <p
                    className="pa-mono mt-0.5 text-sm font-medium"
                    style={{
                      color:
                        rule.confidence === "unverified" ? "var(--slate)" : "var(--ink)",
                    }}
                  >
                    {rule.value}
                  </p>
                  {rule.note ? (
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
                      {rule.note}
                    </p>
                  ) : null}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    background: CONFIDENCE_STYLE[rule.confidence].bg,
                    color: CONFIDENCE_STYLE[rule.confidence].color,
                  }}
                >
                  {CONFIDENCE_LABEL[rule.confidence]}
                </span>
              </div>
              <a
                href={rule.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs no-underline hover:underline"
                style={{ color: "var(--green)" }}
              >
                {rule.citation}
                <ExternalLink size={11} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
