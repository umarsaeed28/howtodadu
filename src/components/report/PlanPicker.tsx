"use client";

import { Check, ExternalLink, RotateCw, X } from "lucide-react";
import { planFootprintSf, type PreApprovedPlan } from "@/lib/preapproved-dadus";

export type PlanFit = { fits: boolean; reason: string | null };

/** Every silhouette is drawn at one shared scale so the sizes compare at a glance. */
const SCALE_FT = 38;

function Silhouette({ plan, on }: { plan: PreApprovedPlan; on: boolean }) {
  const w = (plan.widthFt / SCALE_FT) * 100;
  const d = (plan.depthFt / SCALE_FT) * 100;
  return (
    <svg viewBox="0 0 100 100" className="h-14 w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect x={(100 - w) / 2} y={(100 - d) / 2} width={w} height={d} rx="2" fill={on ? "#E6C97E" : "#EADFC0"} stroke="#17241D" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
      {plan.stories === 2 && <line x1={(100 - w) / 2} y1={50} x2={(100 + w) / 2} y2={50} stroke="#17241D" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

const dims = (p: PreApprovedPlan) => `${fmt(p.widthFt)}′ × ${fmt(p.depthFt)}′`;
const fmt = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

/** The list of designs. Selecting one swaps the resizable box for that design's real footprint. */
export function PlanPicker({ plans, fit, activeId, onPick }: { plans: PreApprovedPlan[]; fit: (p: PreApprovedPlan) => PlanFit; activeId: string | null; onPick: (p: PreApprovedPlan | null) => void }) {
  // Designs that fit this lot come first; catalogue order is kept inside each group.
  const ordered = [...plans].sort((a, b) => Number(fit(b).fits) - Number(fit(a).fits));
  return (
    <section aria-labelledby="pp-h" className="mt-4">
      <h4 id="pp-h" className="pa-display text-base" style={{ color: "var(--ink)" }}>Start from a pre-approved design</h4>
      <p className="mt-0.5 text-xs" style={{ color: "var(--slate)" }}>
        Designs the City of Seattle has already approved. Pick one to drop its real footprint on the lot, then drag it where you want it.
      </p>
      <div role="radiogroup" aria-labelledby="pp-h" className="pp-row -mx-1 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2">
        {ordered.map((p) => {
          const f = fit(p);
          const on = activeId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(on ? null : p)}
              className="pp-card relative flex w-[184px] shrink-0 snap-start flex-col rounded-xl p-2.5 text-left"
              data-on={on || undefined}
              style={{ background: "var(--card, #fff)", boxShadow: on ? "0 0 0 2px #145A40, 0 6px 16px -8px rgba(23,36,29,.35)" : "0 1px 2px rgba(23,36,29,.08), 0 4px 14px -6px rgba(23,36,29,.18)", opacity: f.fits || on ? 1 : 0.82 }}
            >
              {on && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "#145A40", color: "#fff" }} aria-hidden>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <span className="pa-inset block rounded-lg px-2 py-1.5"><Silhouette plan={p} on={on} /></span>
              <span className="mt-2 block text-sm font-semibold leading-tight" style={{ color: "var(--ink)" }}>{p.name}</span>
              <span className="block text-[11px]" style={{ color: "var(--slate)" }}>{p.designer}</span>
              <span className="mt-1.5 block text-xs tabular-nums" style={{ color: "var(--ink)" }}>
                <strong>{p.sqft.toLocaleString("en-US")} sf</strong> · {p.beds === "Studio" ? "Studio" : `${p.beds} bed`}
              </span>
              <span className="block text-xs tabular-nums" style={{ color: "var(--slate)" }}>
                {p.approx ? "about " : ""}{dims(p)}{p.stories === 2 ? " · 2 floors" : ""}
              </span>
              <span
                className="mt-2 inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                style={f.fits ? { background: "var(--green-tint)", color: "var(--green)" } : { background: "var(--amber-tint)", color: "var(--amber)" }}
              >
                {f.fits ? "Fits this lot" : f.reason ?? "Does not fit"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The card shown in place of the resizable-box card while a design is placed. */
export function PlacedPlanCard({
  plan,
  rotated,
  living,
  maxLiving,
  checks,
  onRotate,
  onRemove,
}: {
  plan: PreApprovedPlan;
  rotated: boolean;
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
        <a href={plan.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline" style={{ color: "var(--green)" }}>
          Plans on ADUniverse <ExternalLink size={12} aria-hidden />
        </a>
      </div>
      <p style={{ color: "var(--ink)" }}>
        <span className="pa-display text-2xl tabular-nums">{rotated ? `${fmt(plan.depthFt)}′ × ${fmt(plan.widthFt)}′` : dims(plan)}</span>
        <span className="ml-2 text-sm tabular-nums" style={{ color: "var(--slate)" }}>
          {planFootprintSf(plan).toLocaleString("en-US")} sf footprint{plan.approx ? ", approximate" : ""}
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
        <button type="button" className="pa-btn pa-btn-sm" onClick={(e) => { e.stopPropagation(); onRotate(); }}><RotateCw size={14} aria-hidden /> Rotate 90°</button>
        <button type="button" className="pa-btn pa-btn-sm" onClick={(e) => { e.stopPropagation(); onRemove(); }}><X size={14} aria-hidden /> Remove design</button>
      </div>
      <p className="text-[11px]" style={{ color: "var(--slate)" }}>
        Drag the footprint on the plan to place it. Turn it with the handle above it, double-click, or press R. Its size is fixed because the City approved this design as drawn. Removing it brings back the resizable box.
      </p>
    </div>
  );
}
