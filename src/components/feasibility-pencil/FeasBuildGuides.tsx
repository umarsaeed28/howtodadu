"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FeasibilityTableRow } from "@/lib/feasibility-table-model";
import { buildScenariosForOptions } from "@/lib/scenario-economics";

const GUIDE_STEPS: Record<string, string[]> = {
  DADU: [
    "Confirm rear-yard setbacks and access path for construction.",
    "Choose detached vs. garage conversion; size to the buildable envelope.",
    "Design for Seattle DADU height and coverage limits; submit for SDCI review.",
    "Build, inspect, and obtain certificate of occupancy.",
  ],
  AADU: [
    "Survey the main house for basement, attic, or addition potential.",
    "Design an attached unit meeting fire separation and egress rules.",
    "Permit as an attached ADU or internal conversion.",
    "Complete construction and final inspection.",
  ],
  Townhouses: [
    "Confirm LR density and unit count for the lot width.",
    "Lay out row units with shared walls and individual entries.",
    "Permit as lowrise multifamily; coordinate utility separations.",
    "Build in phases or as a single project.",
  ],
  Apartments: [
    "Model unit count against LR floor area and parking requirements.",
    "Design a multi-unit lowrise building on the lot.",
    "Run full design review if required by overlay or zone.",
    "Permit, build, and stabilize.",
  ],
  default: [
    "Confirm zoning and envelope with SDCI early assistance.",
    "Develop a massing study aligned with allowed housing types.",
    "Permit architectural and structural drawings.",
    "Build and inspect.",
  ],
};

export default function FeasBuildGuides({ detailRow }: { detailRow: FeasibilityTableRow }) {
  const scenarios = useMemo(() => {
    const eligible = detailRow.report.housingOptions.filter((o) => o.allowed);
    return buildScenariosForOptions(eligible, detailRow.report, detailRow.result);
  }, [detailRow]);

  if (scenarios.length === 0) {
    return (
      <section className="px-4 pt-6 sm:px-5">
        <h3 className="pa-display text-base" style={{ color: "var(--ink)" }}>
          Build options
        </h3>
        <p className="mt-2 text-sm" style={{ color: "var(--slate)" }}>
          No eligible build scenarios were identified from the current GIS read. Verify zoning with
          SDCI.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="build-guides-heading" className="px-4 pt-6 sm:px-5">
      <h3 id="build-guides-heading" className="pa-display text-base" style={{ color: "var(--ink)" }}>
        Build options · complete guides
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--slate)" }}>
        Each realistic way to develop this property, with what it is, why it fits, constraints to
        verify, and the steps to get there.
      </p>

      <div className="mt-4 space-y-3">
        {scenarios.map((s) => (
          <BuildGuideCard key={s.optionType} scenario={s} />
        ))}
      </div>
    </section>
  );
}

function BuildGuideCard({
  scenario,
}: {
  scenario: ReturnType<typeof buildScenariosForOptions>[number];
}) {
  const [open, setOpen] = useState(scenario.optionType === "DADU" || scenario.optionType === "Townhouses");
  const steps = GUIDE_STEPS[scenario.optionType] ?? GUIDE_STEPS.default;
  const opt = scenario.housingOption;

  return (
    <article
      className="overflow-hidden rounded-[10px] border"
      style={{ borderColor: "var(--hairline)", background: "var(--card)" }}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <p className="pa-display text-base" style={{ color: "var(--ink)" }}>
            {opt.type}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--slate)" }}>
            {opt.description}
            {opt.estimatedUnits != null ? ` · ~${opt.estimatedUnits} units` : ""}
          </p>
        </div>
        {open ? (
          <ChevronUp size={18} aria-hidden style={{ color: "var(--slate)", marginTop: 4 }} />
        ) : (
          <ChevronDown size={18} aria-hidden style={{ color: "var(--slate)", marginTop: 4 }} />
        )}
      </button>

      {open && (
        <div className="space-y-4 border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--hairline)" }}>
          <GuideBlock title="Why this fits" body={scenario.siteFit.whyEligible} />
          {scenario.siteFit.advantages.length > 0 && (
            <GuideList title="Site advantages" items={scenario.siteFit.advantages} />
          )}
          {scenario.siteFit.constraints.length > 0 && (
            <GuideList title="Constraints to verify" items={scenario.siteFit.constraints} tone="caution" />
          )}
          <GuideList title="Steps to build" items={steps} ordered />
          {scenario.risks.length > 0 && (
            <GuideList title="Risks to plan for" items={scenario.risks.slice(0, 3)} tone="caution" />
          )}
          <p className="text-xs leading-relaxed" style={{ color: "var(--slate)" }}>
            {opt.note}
          </p>
        </div>
      )}
    </article>
  );
}

function GuideBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="pa-eyebrow mb-1" style={{ color: "var(--slate)" }}>
        {title}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        {body}
      </p>
    </div>
  );
}

function GuideList({
  title,
  items,
  ordered,
  tone,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  tone?: "caution";
}) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <div>
      <p className="pa-eyebrow mb-1.5" style={{ color: "var(--slate)" }}>
        {title}
      </p>
      <Tag
        className={`space-y-1.5 pl-4 text-sm leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`}
        style={{ color: tone === "caution" ? "var(--amber)" : "var(--ink)" }}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Tag>
    </div>
  );
}
