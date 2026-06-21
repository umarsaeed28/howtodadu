export interface RectLot {
  widthFt: number;
  depthFt: number;
}

export interface Setbacks {
  frontFt: number;
  rearFt: number;
  sideFt: number;
}

export interface BuildableEnvelope {
  xFt: number;
  yFt: number;
  wFt: number;
  dFt: number;
  areaSf: number;
}

export interface PlacedStructure {
  id: string;
  label: string;
  kind: "existing" | "proposed";
  xFt: number;
  yFt: number;
  wFt: number;
  dFt: number;
  sublabel?: string;
}

export interface SitePlanInput {
  lot: RectLot;
  setbacks: Setbacks;
  structures: PlacedStructure[];
  scalePxPerFt?: number;
  geometrySource: string;
  caption?: string;
  northUp?: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildableEnvelope(lot: RectLot, setbacks: Setbacks): BuildableEnvelope {
  const wFt = round2(Math.max(0, lot.widthFt - 2 * setbacks.sideFt));
  const dFt = round2(Math.max(0, lot.depthFt - setbacks.frontFt - setbacks.rearFt));
  return {
    xFt: setbacks.sideFt,
    yFt: setbacks.frontFt,
    wFt,
    dFt,
    areaSf: round2(wFt * dFt),
  };
}

export function structureFitsEnvelope(
  st: Pick<PlacedStructure, "xFt" | "yFt" | "wFt" | "dFt">,
  env: BuildableEnvelope,
  tol = 0.01
): boolean {
  return (
    st.xFt >= env.xFt - tol &&
    st.yFt >= env.yFt - tol &&
    st.xFt + st.wFt <= env.xFt + env.wFt + tol &&
    st.yFt + st.dFt <= env.yFt + env.dFt + tol
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderFromGisPolygon(): never {
  throw new Error(
    "GIS parcel polygon rendering requires an authoritative King County parcel boundary and a real inward-offset engine (e.g. @turf/turf buffer or clipper-lib). Refusing to fabricate a buildable envelope from an assumed rectangle. Wire polygon fetch + inward offset before calling this path."
  );
}

export function renderSitePlan(input: SitePlanInput): string {
  const {
    lot,
    setbacks,
    structures,
    scalePxPerFt = 3.5,
    geometrySource,
    caption,
    northUp = true,
  } = input;

  const env = buildableEnvelope(lot, setbacks);
  const pad = 40;
  const planW = lot.widthFt * scalePxPerFt;
  const planH = lot.depthFt * scalePxPerFt;
  const viewW = 680;
  const viewH = Math.round(planH + pad * 2 + 120);

  const ox = (viewW - planW) / 2;
  const oy = pad;

  const toPx = (xFt: number, yFt: number): { x: number; y: number } => {
    const x = ox + xFt * scalePxPerFt;
    const y = northUp
      ? oy + (lot.depthFt - yFt) * scalePxPerFt
      : oy + yFt * scalePxPerFt;
    return { x, y };
  };

  const rectPath = (xFt: number, yFt: number, wFt: number, dFt: number): string => {
    const tl = toPx(xFt, yFt + dFt);
    const tr = toPx(xFt + wFt, yFt + dFt);
    const br = toPx(xFt + wFt, yFt);
    const bl = toPx(xFt, yFt);
    return `M ${tl.x.toFixed(2)} ${tl.y.toFixed(2)} L ${tr.x.toFixed(2)} ${tr.y.toFixed(2)} L ${br.x.toFixed(2)} ${br.y.toFixed(2)} L ${bl.x.toFixed(2)} ${bl.y.toFixed(2)} Z`;
  };

  const lotPath = rectPath(0, 0, lot.widthFt, lot.depthFt);
  const envPath = rectPath(env.xFt, env.yFt, env.wFt, env.dFt);

  const structureSvgs = structures
    .map((st) => {
      const isExisting = st.kind === "existing";
      const fill = isExisting ? "rgba(136,135,128,0.32)" : "rgba(151,196,89,0.18)";
      const stroke = isExisting ? "#5F5E5A" : "#639922";
      const strokeWidth = isExisting ? 1.5 : 2.5;
      const path = rectPath(st.xFt, st.yFt, st.wFt, st.dFt);
      const cx = ox + (st.xFt + st.wFt / 2) * scalePxPerFt;
      const cy = northUp
        ? oy + (lot.depthFt - st.yFt - st.dFt / 2) * scalePxPerFt
        : oy + (st.yFt + st.dFt / 2) * scalePxPerFt;
      const sub = st.sublabel ? `<tspan x="${cx.toFixed(2)}" dy="14" class="ts">${escapeXml(st.sublabel)}</tspan>` : "";
      return `<g>
  <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
  <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" class="t">${escapeXml(st.label)}${sub}</text>
</g>`;
    })
    .join("\n");

  const scaleBarLen = 20 * scalePxPerFt;
  const scaleY = viewH - 48;
  const scaleX = viewW - scaleBarLen - 48;

  const captionText =
    caption ??
    "Measured parcel boundary · schematic structures labeled · not a survey or permit document";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-labelledby="siteplan-title siteplan-desc">
<style>
  .t { font: 600 12px system-ui, sans-serif; fill: var(--color-text-primary, #1a1a1a); }
  .ts { font: 400 10px system-ui, sans-serif; fill: var(--color-text-secondary, #666); }
  .th { font: 600 11px system-ui, sans-serif; fill: var(--color-text-secondary, #666); }
</style>
<title id="siteplan-title">Rectangular site plan</title>
<desc id="siteplan-desc">${escapeXml(geometrySource)}</desc>
<rect width="100%" height="100%" fill="var(--color-bg, #fafafa)" />
<path d="${lotPath}" fill="none" stroke="var(--color-text-secondary, #555)" stroke-width="2.5" />
<path d="${envPath}" fill="none" stroke="var(--color-text-tertiary, #999)" stroke-width="1.5" stroke-dasharray="5 4" />
${structureSvgs}
<g aria-label="North arrow">
  <text x="24" y="28" class="th">N</text>
  <path d="M 32 36 L 32 56 M 32 36 L 26 48 M 32 36 L 38 48" stroke="var(--color-text-secondary, #555)" fill="none" stroke-width="1.5" />
</g>
<g aria-label="Legend">
  <rect x="24" y="${scaleY - 52}" width="14" height="14" fill="rgba(136,135,128,0.32)" stroke="#5F5E5A" />
  <text x="44" y="${scaleY - 41}" class="ts">Existing (measured/schematic placement)</text>
  <rect x="24" y="${scaleY - 32}" width="14" height="14" fill="rgba(151,196,89,0.18)" stroke="#639922" stroke-width="2" />
  <text x="44" y="${scaleY - 21}" class="ts">Proposed · schematic fit study</text>
</g>
<g aria-label="Scale bar">
  <line x1="${scaleX}" y1="${scaleY}" x2="${scaleX + scaleBarLen}" y2="${scaleY}" stroke="var(--color-text-secondary, #555)" stroke-width="2" />
  <text x="${scaleX + scaleBarLen / 2}" y="${scaleY + 16}" text-anchor="middle" class="ts">20 ft</text>
</g>
<text x="${viewW / 2}" y="${viewH - 12}" text-anchor="middle" class="ts">${escapeXml(captionText)}</text>
</svg>`;
}
