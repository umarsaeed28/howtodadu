import { Check, X } from "lucide-react";
import { planFamilies, type PreApprovedPlan } from "@/lib/preapproved-dadus";
import type { PlanFit } from "@/lib/site-envelope";
import { withParcel } from "@/lib/parcel-context";
import { TrackedLink } from "./HomeBits";

/** The footprint drawn to scale, with a dashed second outline for a second story. Stands in until plan images exist. */
export function Footprint({ p, size = 48 }: { p: Pick<PreApprovedPlan, "widthFt" | "depthFt" | "stories">; size?: number }) {
  const box = 40;
  const s = box / Math.max(p.widthFt, p.depthFt);
  const w = p.widthFt * s;
  const d = p.depthFt * s;
  const x = (48 - w) / 2;
  const y = (48 - d) / 2;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="pc-art" role="img" aria-label={`Footprint about ${Math.round(p.widthFt)} by ${Math.round(p.depthFt)} feet${p.stories === 2 ? ", two stories" : ""}`}>
      {p.stories === 2 && <rect x={x + 2.5} y={y - 2.5} width={w} height={d} rx="1" fill="none" stroke="#1F7A55" strokeOpacity=".45" strokeDasharray="2 1.5" />}
      <rect x={x} y={y} width={w} height={d} rx="1" fill="#E6F2EB" stroke="#1F7A55" strokeWidth="1.2" />
    </svg>
  );
}

const plural = (n: string, word: string) => (n === "Studio" ? "Studio" : `${n} ${word}${n === "1" ? "" : "s"}`);
export const familyName = (p: PreApprovedPlan) => p.name.replace(/,? \d bed$/, "").replace(/ (Studio|1 Bed|2 Bed|Two Story)$/, "");

/**
 * One card per design from the City's pre-approved gallery: firm, size, bed/bath, stories, and the way in to the
 * detail page. With a parcel, each card carries whether the design fits that lot (as drawn: no changes).
 */
export default function PlanCards({ families = planFamilies(), fits, parcel }: { families?: PreApprovedPlan[][]; fits?: Record<string, PlanFit>; parcel?: string | null }) {
  return (
    <ul className="pc-grid">
      {families.map((vs) => {
        const p = vs[0];
        const sizes = vs.map((v) => v.sqft);
        const sf = sizes.length > 1 ? `${Math.min(...sizes).toLocaleString()} to ${Math.max(...sizes).toLocaleString()} sf` : `${p.sqft.toLocaleString()} sf`;
        const beds = [...new Set(vs.map((v) => v.beds))];
        const fit = fits?.[p.family];
        return (
          <li key={p.family} className="pc" data-fit={fit ? String(fit.fits) : undefined}>
            <div className="pc-media">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={`${familyName(p)} by ${p.designer}`} loading="lazy" />
              ) : (
                <Footprint p={p} size={96} />
              )}
              {fit && (
                <span className={`pc-fit${fit.fits ? "" : " pc-fit--no"}`}>
                  {fit.fits ? <Check size={13} strokeWidth={3} aria-hidden /> : <X size={13} strokeWidth={3} aria-hidden />}
                  {fit.fits ? "Fits your lot" : fit.reason ?? "Does not fit"}
                </span>
              )}
            </div>
            <div className="pc-body">
              <h3 className="pc-name">{familyName(p)}</h3>
              <p className="pc-firm">{p.designer}</p>
              <dl className="pc-facts">
                <div><dt>Size</dt><dd>{sf}</dd></div>
                <div><dt>Beds</dt><dd>{beds.length > 1 ? `${beds.join(", ")} bed` : plural(p.beds, "bed")}</dd></div>
                <div><dt>Baths</dt><dd>{p.baths}</dd></div>
                <div><dt>Stories</dt><dd>{[...new Set(vs.map((v) => v.stories))].join(" or ")}</dd></div>
              </dl>
              <TrackedLink href={withParcel(`/plans/${encodeURIComponent(p.family)}`, parcel)} event="plan_viewed" props={{ plan_id: p.id }} className="s-btn s-btn--outline pc-btn" ariaLabel={`See ${familyName(p)} by ${p.designer}`}>
                See the plan
              </TrackedLink>
              {parcel && (
                <TrackedLink href={`/feasibility?${new URLSearchParams({ parcel, plan: p.id }).toString()}`} event="plan_feasibility_started" props={{ plan_id: p.id }} className="s-btn s-btn--primary pc-btn" ariaLabel={`Check feasibility with ${familyName(p)}`}>
                  Check feasibility with this plan
                </TrackedLink>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
