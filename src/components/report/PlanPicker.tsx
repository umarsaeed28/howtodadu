"use client";

import { Check, ExternalLink, RotateCw, X } from "lucide-react";
import { planFamilies, planFootprintSf, type PreApprovedPlan } from "@/lib/preapproved-dadus";

export type PlanFit = { fits: boolean; reason: string | null };

/** Every silhouette is drawn at one shared scale so the sizes compare at a glance. */
const SCALE_FT = 38;

function Silhouette({ plan, on }: { plan: PreApprovedPlan; on: boolean }) {
  const w = (plan.widthFt / SCALE_FT) * 100;
  const d = (plan.depthFt / SCALE_FT) * 100;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect x={(100 - w) / 2} y={(100 - d) / 2} width={w} height={d} rx="2" fill={on ? "#E6C97E" : "#EADFC0"} stroke="#17241D" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      {plan.stories === 2 && <line x1={(100 - w) / 2} y1={50} x2={(100 + w) / 2} y2={50} stroke="#17241D" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

const dims = (p: PreApprovedPlan) => `${fmt(p.widthFt)}′ × ${fmt(p.depthFt)}′`;
const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

/** The list of designs. Selecting one swaps the resizable box for that design's real footprint. */
export function PlanPicker({ plans, fit, activeId, onPick }: { plans: PreApprovedPlan[]; fit: (p: PreApprovedPlan) => PlanFit; activeId: string | null; onPick: (p: PreApprovedPlan | null) => void }) {
  // One row per design. Designs with a size that fits this lot come first; catalogue order is kept inside each group.
  const families = planFamilies(plans);
  const bestOf = (vs: PreApprovedPlan[]) => vs.find((v) => fit(v).fits) ?? vs[0];
  const ordered = [...families].sort((a, b) => Number(fit(bestOf(b)).fits) - Number(fit(bestOf(a)).fits));
  const activeFamily = plans.find((p) => p.id === activeId)?.family ?? null;
  const fitting = families.filter((vs) => vs.some((v) => fit(v).fits)).length;
  return (
    <section aria-labelledby="pp-h" className="mt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 id="pp-h" className="pa-display text-base" style={{ color: "var(--ink)" }}>Pre-approved designs</h4>
        <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--slate)" }}>{fitting} of {families.length} fit this lot</span>
      </div>
      <p className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>
        Approved by the City of Seattle. Pick one to place its real footprint, then drag and turn it on the plan.
      </p>
      <ul role="radiogroup" aria-labelledby="pp-h" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {ordered.map((vs) => {
          const lead = vs.find((v) => v.id === activeId) ?? bestOf(vs);
          const f = fit(lead);
          const on = activeFamily === lead.family;
          const multi = vs.length > 1;
          const lo = Math.min(...vs.map((v) => v.sqft)), hi = Math.max(...vs.map((v) => v.sqft));
          const title = multi ? lead.name.replace(/\s+(Studio|\d Bed|Two Story)$/, "").replace(/, \d bed$/, "") : lead.name;
          const area = multi && lo !== hi ? `${lo.toLocaleString("en-US")}–${hi.toLocaleString("en-US")} sf` : `${lead.sqft.toLocaleString("en-US")} sf`;
          const beds = multi ? `${vs.length} sizes` : lead.beds === "Studio" ? "Studio" : `${lead.beds} bed`;
          return (
            <li key={lead.family} className="relative">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(on ? null : lead)}
                className="pp-row flex w-full items-center gap-3 rounded-xl py-2 pl-2 pr-11 text-left transition-shadow"
                style={{
                  background: on ? "var(--green-tint)" : "var(--card, #fff)",
                  boxShadow: on ? "inset 0 0 0 1.5px #145A40" : "0 1px 2px rgba(23,36,29,.08), 0 3px 10px -6px rgba(23,36,29,.2)",
                  opacity: f.fits || on ? 1 : 0.7,
                }}
              >
                <span className="pa-inset relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg p-1">
                  <Silhouette plan={lead} on={on} />
                  {on && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "#145A40", color: "#fff" }} aria-hidden>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold" style={{ color: "var(--ink)" }}>{title}</span>
                    <span className="truncate text-[11px]" style={{ color: "var(--slate)" }}>{lead.designer}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums" style={{ color: "var(--slate)" }}>
                    <span style={{ color: "var(--ink)" }}>{area}</span>
                    <span aria-hidden>·</span>
                    <span>{beds}</span>
                    {!multi && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{lead.approx ? "~" : ""}{dims(lead)}{lead.stories === 2 ? ", 2 fl" : ""}</span>
                      </>
                    )}
                    {!f.fits && (
                      <span className="rounded px-1 py-px text-[10px] font-semibold" style={{ background: "var(--amber-tint)", color: "var(--amber)" }}>{f.reason ?? "Does not fit"}</span>
                    )}
                  </span>
                </span>
              </button>
              <a
                href={lead.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open the ${lead.designer} plan set (PDF)`}
                aria-label={`Open the plan set for ${title} (PDF, new tab)`}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg"
                style={{ color: "var(--green)" }}
              >
                <ExternalLink size={14} aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The card shown in place of the resizable-box card while a design is placed. */
export function PlacedPlanCard({
  plan,
  variants,
  onVariant,
  fit,
  angle,
  living,
  maxLiving,
  checks,
  onRotate,
  onRemove,
}: {
  plan: PreApprovedPlan;
  variants: PreApprovedPlan[];
  onVariant: (p: PreApprovedPlan) => void;
  fit: (p: PreApprovedPlan) => PlanFit;
  angle: number;
  living: number;
  maxLiving: number;
  checks: { ok: boolean; text: string }[];
  onRotate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm" style={{ color: "var(--ink)" }}>
          <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: "#E6C97E", border: "1px solid #17241D" }} />
          <span className="font-semibold">{plan.name}</span>
          <span style={{ color: "var(--slate)" }}> by {plan.designer}</span>
        </p>
        <span className="inline-flex items-center gap-3 text-xs font-semibold">
          <a href={plan.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
            Plan set (PDF) <ExternalLink size={12} aria-hidden />
          </a>
          <a href={plan.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
            ADUniverse <ExternalLink size={12} aria-hidden />
          </a>
        </span>
      </div>
      {variants.length > 1 && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Size">
          {variants.map((v) => {
            const f = fit(v);
            return (
              <button key={v.id} type="button" role="radio" aria-checked={v.id === plan.id} disabled={!f.fits && v.id !== plan.id} title={f.fits ? undefined : f.reason ?? undefined} onClick={(e) => { e.stopPropagation(); onVariant(v); }} className={`pa-chip ${v.id === plan.id ? "pa-chip-active" : ""}`} style={{ minHeight: 30, opacity: f.fits || v.id === plan.id ? 1 : 0.5 }}>
                {v.option}
              </button>
            );
          })}
        </div>
      )}
      <p style={{ color: "var(--ink)" }}>
        <span className="pa-display text-2xl tabular-nums">{dims(plan)}</span>
        <span className="ml-2 text-sm tabular-nums" style={{ color: "var(--slate)" }}>
          {planFootprintSf(plan).toLocaleString("en-US")} sf footprint{plan.approx ? ", approximate" : ""}{angle % 360 !== 0 ? `, turned ${Math.round(angle)}°` : ""}
        </span>
      </p>
      <p className="text-sm tabular-nums" style={{ color: living > maxLiving ? "var(--red)" : "var(--ink)" }}>
        Living area <strong>{living.toLocaleString("en-US")} sf</strong> of {maxLiving.toLocaleString("en-US")} sf allowed · {plan.beds === "Studio" ? "Studio" : `${plan.beds} bed`}, {plan.baths} bath · ${plan.licenseFee.toLocaleString("en-US")} to license
      </p>
      <p className="text-xs" style={{ color: "var(--slate)" }}>{plan.note}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {checks.map((k) => <li key={k.text} style={{ color: k.ok ? "var(--green)" : "var(--red)" }}>{k.text}</li>)}
      </ul>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button type="button" className="pa-btn pa-btn-sm" onClick={(e) => { e.stopPropagation(); onRotate(); }}><RotateCw size={14} aria-hidden /> Turn 90°</button>
        <button type="button" className="pa-btn pa-btn-sm" onClick={(e) => { e.stopPropagation(); onRemove(); }}><X size={14} aria-hidden /> Remove design</button>
      </div>
      <p className="text-[11px]" style={{ color: "var(--slate)" }}>
        Drag the footprint on the plan to place it. Turn it freely with the small handle above it (hold Shift to turn in 15° steps), or use Turn 90°. Its size is fixed because the City approved this design as drawn. Removing it brings back the resizable box.
      </p>
    </div>
  );
}
