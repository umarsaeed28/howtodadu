import type { Block } from "@/lib/custom/layout";

const FILL: Record<Block["kind"], string> = {
  living: "#E6F2EB",
  kitchen: "#F4EAD2",
  bedroom: "#DCEBF2",
  bath: "#E8E1F1",
  stair: "#EEF1EF",
  mechanical: "#EEF1EF",
  hall: "#F6F7F6",
};

/** One floor of a draft as a plan drawing: room blocks to scale with labels, walls in ink. */
function Floor({ blocks, w, d, title }: { blocks: Block[]; w: number; d: number; title: string }) {
  const pad = 1.5;
  return (
    <figure className="dp-floor">
      <svg viewBox={`${-pad} ${-pad} ${w + pad * 2} ${d + pad * 2}`} role="img" aria-label={`${title}: ${blocks.map((b) => `${b.label ?? b.kind} ${b.w} by ${b.h} feet`).join(", ")}`}>
        {blocks.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={FILL[b.kind]} stroke="#111614" strokeWidth={0.18} />
            {b.kind === "stair" && Array.from({ length: Math.max(3, Math.floor(b.h / 0.9)) }, (_, k) => <line key={k} x1={b.x} x2={b.x + b.w} y1={b.y + (k + 1) * (b.h / (Math.floor(b.h / 0.9) + 1))} y2={b.y + (k + 1) * (b.h / (Math.floor(b.h / 0.9) + 1))} stroke="#111614" strokeOpacity=".35" strokeWidth={0.08} />)}
            {b.egress && <rect x={b.x + b.w * 0.3} y={b.y < 0.3 ? b.y - 0.15 : b.y + b.h - 0.15} width={b.w * 0.4} height={0.3} fill="#1F7A55" />}
            {b.w >= 4 && b.h >= 3 && (
              <text x={b.x + b.w / 2} y={b.y + b.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(1.3, b.w / 6)} fontFamily="var(--font-body), system-ui" fill="#111614">
                {b.label ?? b.kind}
              </text>
            )}
          </g>
        ))}
        <rect x={0} y={0} width={w} height={d} fill="none" stroke="#111614" strokeWidth={0.45} />
      </svg>
      <figcaption>{title}</figcaption>
    </figure>
  );
}

/** The draft layout, one drawing per floor, labeled as a draft for the architects to finish. */
export default function DraftPlan({ blocks, w, d, stories }: { blocks: Block[]; w: number; d: number; stories: 1 | 2 }) {
  return (
    <div className="dp">
      <p className="dp-label">Draft layout. Our architects finalize every plan.</p>
      <div className="dp-floors">
        <Floor blocks={blocks.filter((b) => b.floor === 1)} w={w} d={d} title={stories === 2 ? "Floor 1" : `${w} x ${d} ft`} />
        {stories === 2 && <Floor blocks={blocks.filter((b) => b.floor === 2)} w={w} d={d} title="Floor 2" />}
      </div>
      <p className="dp-key"><span className="dp-egress" aria-hidden /> Egress window</p>
    </div>
  );
}
