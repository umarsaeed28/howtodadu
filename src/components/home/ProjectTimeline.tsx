/**
 * "How it works" as a schedule: one 10-month axis with a bar per phase, then the phases in order. Durations are
 * typical, not promises; the permit stretch is the city's review, and its length is never promised (copy guardrail).
 */
type Phase = {
  title: string;
  /** When it runs, in months from contract (0 = the day the lot goes under contract). */
  start: number;
  end: number;
  /** The duration as people say it. */
  when: string;
  body: string;
  /** Runs alongside another phase rather than after it. */
  overlap?: boolean;
  /** The city's part: drawn hatched, because its length is SDCI's, not ours. */
  city?: boolean;
};

const MONTHS = 10;

const PHASES: Phase[] = [
  { title: "Acquisition", start: 0, end: 1, when: "Month 1", body: "We find a Seattle lot that takes a DADU, or start from yours, and get it under contract." },
  { title: "Feasibility and surveys", start: 0.2, end: 1, when: "While under contract", overlap: true, body: "Right after the lot goes under contract: the detailed feasibility and the boundary and topographic surveys, before you close." },
  { title: "Design", start: 1, end: 2, when: "Month 2", body: "A pre-approved plan, or a custom design for your lot by our designers." },
  { title: "Permit", start: 2, end: 4, when: "Months 3 to 4, typically", city: true, body: "We submit to SDCI and handle every round of corrections. Review times vary, so we never promise an approval date." },
  { title: "Construction", start: 4, end: 10, when: "Months 5 to 10", body: "Vetted builders, bids side by side, then one tracker from groundbreaking to final inspection." },
];

const pct = (m: number) => `${(m / MONTHS) * 100}%`;

export default function ProjectTimeline() {
  return (
    <div className="tl">
      <div className="tl-chart" role="img" aria-label="Timeline: acquisition in month 1 with feasibility and surveys while under contract, design in month 2, permit typically months 3 to 4, construction months 5 to 10. About 10 months in all.">
        <div className="tl-axis" aria-hidden>
          {Array.from({ length: MONTHS }, (_, i) => (
            <span key={i} className="tl-month" style={{ left: pct(i), width: pct(1) }}>
              <span className="tl-month-full">Month {i + 1}</span>
              <span className="tl-month-short">{i + 1}</span>
            </span>
          ))}
        </div>
        <div className="tl-rows" aria-hidden>
          {Array.from({ length: MONTHS - 1 }, (_, i) => <span key={i} className="tl-grid" style={{ left: pct(i + 1) }} />)}
          {PHASES.map((p) => (
            <div key={p.title} className="tl-row">
              <span className={`tl-bar${p.city ? " tl-bar--city" : ""}${p.overlap ? " tl-bar--overlap" : ""}`} style={{ left: pct(p.start), width: pct(p.end - p.start) }}>
                <span className="tl-bar-label">{p.title}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="tl-total" aria-hidden>
          <span className="tl-total-line" />
          <span className="tl-total-text">About 10 months, contract to final inspection</span>
        </p>
      </div>

      <ol className="tl-phases">
        {PHASES.map((p, i) => (
          <li key={p.title} className="tl-phase">
            <span className="tl-num" aria-hidden>{i + 1}</span>
            <h3 className="tl-title">{p.title}</h3>
            <p className="tl-when">{p.when}</p>
            <p className="tl-body">{p.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
