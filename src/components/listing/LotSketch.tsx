import type { Layout } from "@/lib/dadu-site-plan";

/**
 * A plan view of the lot, drawn to scale in feet: street at the bottom, rear (and alley, when there is one) at the top.
 * The house and cottage are schematic placements from the layout rules, not a survey or a design.
 */
export default function LotSketch({
  widthFt,
  depthFt,
  lotSqft,
  alley,
  corner,
  layout,
  daduSqft,
  sideClearanceFt,
  street,
}: {
  widthFt: number | null;
  depthFt: number | null;
  lotSqft: number;
  alley: boolean;
  corner: boolean;
  layout: Layout;
  daduSqft: number | null;
  sideClearanceFt: number | null;
  street: string;
}) {
  const estimated = !widthFt || !depthFt;
  // Unknown shape: a typical Seattle lot proportion (about 1 : 2.2) at the right area.
  const W = Math.round(widthFt || Math.sqrt(lotSqft / 2.2));
  const D = Math.round(depthFt || lotSqft / W);
  const fs = Math.max(W, D) / 19;
  const band = fs * 2.1;

  // House: 20 ft front setback, leaving the measured side clearance on the driveway side (the right).
  const clear = sideClearanceFt != null ? Math.min(sideClearanceFt, W * 0.5) : W * 0.25;
  const hw = Math.max(W - clear - 5, W * 0.4);
  const hd = Math.min(42, D * 0.32);
  const hx = 5;
  const hy = D - 20 - hd;

  // Cottage footprint: a 1.5 to 2 storey DADU, so the footprint is well under its floor area.
  const fp = daduSqft ? Math.min(daduSqft, 1000) * 0.62 : 0;
  const dw = fp ? Math.min(W - 10, Math.sqrt(fp * 1.25)) : 0;
  const dd = fp ? fp / dw : 0;
  const dy = 5;
  const dx = layout === "single_rear" ? (W - dw) / 2 : layout === "staggered" ? 5 : W - dw - 5;

  const driveway = !alley && !corner && fp > 0;
  const drivewayW = Math.min(10, Math.max(clear - 1, 6));

  return (
    <figure className="m-0">
      <svg
        viewBox={`${-band} ${-(alley ? band * 1.6 : band * 0.6)} ${W + band * (corner ? 2.6 : 2)} ${D + band * (alley ? 3.4 : 2.4)}`}
        className="block h-auto w-full"
        style={{ maxHeight: 360 }}
        role="img"
        aria-label={`Plan of a ${W} by ${D} foot ${corner ? "corner " : ""}lot${alley ? " with an alley at the rear" : ""}, the house at the front and a ${daduSqft ?? 0} square foot cottage at the rear.`}
      >
        <defs>
          <pattern id="sk-drive" width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={3} stroke="#B7C2BC" strokeWidth={0.8} />
          </pattern>
        </defs>

        {/* Alley and street */}
        {alley && <rect x={-band} y={-band * 1.5} width={W + band * 2} height={band * 1.2} rx={fs * 0.3} fill="#E4E8E6" />}
        {alley && <text x={W / 2} y={-band * 0.75} fontSize={fs * 0.8} textAnchor="middle" fill="#5B6560" fontWeight={600}>Alley</text>}
        <rect x={-band} y={D + band * 0.3} width={W + band * 2} height={band * 1.2} rx={fs * 0.3} fill="#E4E8E6" />
        <text x={W / 2} y={D + band * 1.05} fontSize={fs * 0.8} textAnchor="middle" fill="#5B6560" fontWeight={600}>{street}</text>

        {corner && <rect x={W + band * 0.3} y={-band * 0.4} width={band * 1.2} height={D + band * 1.9} rx={fs * 0.3} fill="#E4E8E6" />}
        {corner && <text x={W + band * 0.9} y={D / 2} fontSize={fs * 0.8} textAnchor="middle" dominantBaseline="central" fill="#5B6560" fontWeight={600} transform={`rotate(90 ${W + band * 0.9} ${D / 2})`}>Side street</text>}

        {/* Lot */}
        <rect x={0} y={0} width={W} height={D} fill="#EEF5F0" stroke="#1F7A55" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />

        {driveway && <rect x={W - drivewayW} y={dy + dd} width={drivewayW} height={D - dy - dd} fill="url(#sk-drive)" />}

        {/* House */}
        <rect x={hx} y={hy} width={hw} height={hd} rx={1} fill="#CDD4D0" stroke="#8D9892" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={hx + hw / 2} y={hy + hd / 2} fontSize={fs * 0.85} textAnchor="middle" dominantBaseline="central" fill="#3C4642" fontWeight={600}>House</text>

        {/* Cottage */}
        {fp > 0 && (
          <g>
            <rect x={dx} y={dy} width={dw} height={dd} rx={1} fill="#1F7A55" />
            <text x={dx + dw / 2} y={dy + dd / 2} fontSize={fs * 0.85} textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight={700}>DADU</text>
          </g>
        )}

        {/* Dimensions */}
        <text x={-fs * 0.5} y={D / 2} fontSize={fs * 0.75} textAnchor="middle" fill="#1F7A55" fontWeight={600} transform={`rotate(-90 ${-fs * 0.5} ${D / 2})`}>{D} ft deep</text>
        <text x={W / 2} y={D - fs * 0.5} fontSize={fs * 0.75} textAnchor="middle" fill="#1F7A55" fontWeight={600}>{W} ft wide</text>
      </svg>
      <figcaption className="mt-2 text-xs" style={{ color: "var(--slate)" }}>
        {estimated ? "Shape estimated from the lot area. " : ""}A sketch of where things could go, not a survey or a design.
      </figcaption>
    </figure>
  );
}
