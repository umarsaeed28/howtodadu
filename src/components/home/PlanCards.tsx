import { planFamilies, type PreApprovedPlan } from "@/lib/preapproved-dadus";
import { TrackedLink } from "./HomeBits";

/** The footprint drawn to scale (1 px per ft at the card's viewBox), with a second outline for a second story. */
function Footprint({ p }: { p: PreApprovedPlan }) {
  const box = 40;
  const s = box / Math.max(p.widthFt, p.depthFt);
  const w = p.widthFt * s;
  const d = p.depthFt * s;
  const x = (48 - w) / 2;
  const y = (48 - d) / 2;
  return (
    <svg viewBox="0 0 48 48" className="pc-art" role="img" aria-label={`Footprint about ${Math.round(p.widthFt)} by ${Math.round(p.depthFt)} feet${p.stories === 2 ? ", two stories" : ""}`}>
      {p.stories === 2 && <rect x={x + 2.5} y={y - 2.5} width={w} height={d} rx="1" fill="none" stroke="#1F7A55" strokeOpacity=".45" strokeDasharray="2 1.5" />}
      <rect x={x} y={y} width={w} height={d} rx="1" fill="#E6F2EB" stroke="#1F7A55" strokeWidth="1.2" />
    </svg>
  );
}

const plural = (n: string, word: string) => (n === "Studio" ? "Studio" : `${n} ${word}${n === "1" ? "" : "s"}`);

/**
 * One card per pre-approved design from the City's gallery: firm, size, bed/bath, stories, and a link that opens
 * the feasibility check (with the plan named in the link) to see whether it fits a lot.
 */
export default function PlanCards() {
  const families = planFamilies();
  return (
    <ul className="pc-grid">
      {families.map((vs) => {
        const p = vs[0];
        const sizes = vs.map((v) => v.sqft);
        const sf = sizes.length > 1 ? `${Math.min(...sizes)} to ${Math.max(...sizes)} sf` : `${p.sqft} sf`;
        const beds = [...new Set(vs.map((v) => v.beds))];
        return (
          <li key={p.family} className="pc">
            <div className="pc-top">
              <Footprint p={p} />
              <div className="pc-head">
                <h3 className="pc-name">{p.name.replace(/,? \d bed$/, "").replace(/ (Studio|1 Bed|2 Bed|Two Story)$/, "")}</h3>
                <p className="pc-firm">{p.designer}</p>
              </div>
            </div>
            <dl className="pc-facts">
              <div><dt>Size</dt><dd>{sf}</dd></div>
              <div><dt>Beds</dt><dd>{beds.length > 1 ? `${beds.join(", ")} bed` : plural(p.beds, "bed")}</dd></div>
              <div><dt>Baths</dt><dd>{p.baths}</dd></div>
              <div><dt>Stories</dt><dd>{[...new Set(vs.map((v) => v.stories))].join(" or ")}</dd></div>
            </dl>
            <TrackedLink href={`/plans/${encodeURIComponent(p.id)}`} event="plan_viewed" props={{ plan_id: p.id }} className="s-btn s-btn--outline pc-btn" ariaLabel={`Check if ${p.name} fits my lot`}>
              Check if it fits my lot
            </TrackedLink>
          </li>
        );
      })}
    </ul>
  );
}
