import type { DashboardPropertySlim } from "@/lib/dashboard-normalize";
import type { FeasibilityReport } from "../../../packages/schema/src";
import type { PlanSnapshot } from "@/components/report/MasterPlan";
import { COST_LABEL, COST_PER_SF } from "@/lib/config/costs";
import { svgToPng, type Raster } from "./rasterize-svg";

const SCENARIO_NAMES: Record<string, string> = {
  single_dadu: "One backyard cottage",
  two_dadus: "Two backyard cottages",
  aadu_plus_dadu: "Attached unit plus cottage",
  nr_middle_housing: "Middle housing (4 to 6 homes)",
  unit_lot_subdivision: "Unit lot subdivision",
};

const INK: RGB = [23, 36, 29];
const SLATE: RGB = [88, 104, 96];
const GREEN: RGB = [20, 90, 64];
const AMBER: RGB = [184, 134, 43];
const RED: RGB = [185, 87, 63];
const HAIR: RGB = [214, 220, 214];
type RGB = [number, number, number];

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const sf = (n: number) => `${Math.round(n).toLocaleString("en-US")} sf`;

/** The built-in PDF fonts are Latin-1 only; swap the few typographic characters the report uses and drop the rest. */
const clean = (s: string) =>
  s
    .replace(/[′’‘]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, "");

export interface ReportPdfInput {
  slim: Pick<DashboardPropertySlim, "address" | "streetLine" | "neighborhood" | "zoning">;
  report: FeasibilityReport;
  plan: PlanSnapshot | null;
}

export async function buildReportPdf({ slim, report, plan }: ReportPdfInput) {
  const { jsPDF } = await import("jspdf");
  // Rasterize before touching the PDF so a failure here leaves nothing half-built.
  const planImg: Raster | null = plan?.plan ? await svgToPng(plan.plan, 2600) : null;
  const sectionImg: Raster | null = plan?.section ? await svgToPng(plan.section, 2400) : null;

  const pdf = new jsPDF({ unit: "mm", format: "letter" });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 14;
  const CW = PW - M * 2;
  const FOOT = 12;
  let y = M;
  const generated = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const color = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
  };
  const lineH = (size: number) => size * 0.4;
  const room = (h: number) => {
    if (y + h > PH - M - FOOT) {
      pdf.addPage();
      y = M;
    }
  };
  /** Wrapped text at the left margin (or `x`), moving the cursor down. */
  const text = (t: string, o: { size?: number; bold?: boolean; c?: RGB; x?: number; w?: number; gap?: number } = {}) => {
    const size = o.size ?? 9.5;
    font(size, o.bold);
    color(o.c ?? INK);
    const x = o.x ?? M;
    const lines = pdf.splitTextToSize(clean(t), o.w ?? CW - (x - M)) as string[];
    for (const ln of lines) {
      room(lineH(size) + 1);
      pdf.text(ln, x, y + lineH(size));
      y += lineH(size) + 1;
    }
    y += o.gap ?? 0;
  };
  const rule = () => {
    pdf.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
    pdf.setLineWidth(0.25);
    pdf.line(M, y, PW - M, y);
    y += 3;
  };
  const heading = (t: string, hint?: string) => {
    room(16);
    y += 3;
    text(t, { size: 12.5, bold: true, gap: hint ? 0 : 1.5 });
    if (hint) text(hint, { size: 8.5, c: SLATE, gap: 1.5 });
  };
  const bullet = (t: string, c: RGB = INK, mark = "-") => {
    font(9.5);
    const lines = pdf.splitTextToSize(clean(t), CW - 6) as string[];
    room(lines.length * (lineH(9.5) + 1));
    color(c);
    pdf.text(mark, M + 1, y + lineH(9.5));
    color(INK);
    for (const ln of lines) {
      pdf.text(ln, M + 6.5, y + lineH(9.5));
      y += lineH(9.5) + 1;
    }
    y += 0.8;
  };
  const image = (img: Raster, maxH: number) => {
    const w = CW;
    const h = Math.min(maxH, (img.height / img.width) * w);
    const drawW = (img.width / img.height) * h;
    room(h + 2);
    pdf.setDrawColor(HAIR[0], HAIR[1], HAIR[2]);
    pdf.roundedRect(M, y, CW, h, 1.5, 1.5, "S");
    pdf.addImage(img.dataUrl, "PNG", M + (CW - Math.min(drawW, w)) / 2, y, Math.min(drawW, w), h, undefined, "FAST");
    y += h + 3;
  };

  /* ---- masthead ---- */
  font(9, true);
  color(GREEN);
  pdf.text("PENCIL  |  DADU FEASIBILITY REPORT", M, y + 3);
  font(8.5);
  color(SLATE);
  pdf.text(clean(generated), PW - M, y + 3, { align: "right" });
  y += 8;
  text(slim.streetLine || slim.address, { size: 19, bold: true, gap: 0 });
  text(`${slim.neighborhood}${slim.zoning ? `, zoned ${slim.zoning}` : ""}`, { size: 10, c: SLATE, gap: 2 });
  rule();

  /* ---- verdict ---- */
  const s = report.summary;
  const vc: RGB = s.verdict === "Feasible" ? GREEN : s.verdict === "Conditional" ? AMBER : RED;
  const boxY = y;
  font(26, true);
  color(vc);
  pdf.text(String(Math.round(s.score.value)), M, boxY + 11);
  font(8.5, true);
  pdf.text(clean(s.verdict.toUpperCase()), M, boxY + 16);
  const colX = M + 32;
  y = boxY;
  text(s.headline, { size: 10.5, x: colX, w: CW - 32 - 62, gap: 0 });
  const left = y;
  const sx = PW - M - 58;
  const stat = (label: string, value: string, yy: number) => {
    font(7.5, true);
    color(SLATE);
    pdf.text(clean(label.toUpperCase()), sx, yy);
    font(13, true);
    color(INK);
    pdf.text(clean(value), sx, yy + 5.5);
  };
  stat("Max buildable", s.max_buildable_sf ? sf(s.max_buildable_sf.value) : "None", boxY + 3);
  stat("Build estimate", s.construction_cost_usd ? usd(s.construction_cost_usd.value) : "None", boxY + 15);
  y = Math.max(left, boxY + 25);
  if (s.max_buildable_sf && s.construction_cost_usd) {
    text(`${sf(s.max_buildable_sf.value)} x ${usd(COST_PER_SF)} per sf. ${COST_LABEL}.`, { size: 8, c: SLATE, x: sx, w: 58, gap: 0 });
  }
  y += 2;
  rule();

  /* ---- master plan, as the user arranged it ---- */
  heading("Master plan", "The lot as drawn in the report, with each cottage where it was placed when this PDF was made.");
  if (planImg) {
    image(planImg, 126);
    if (plan) {
      const key: [RGB, string][] = [
        [[230, 201, 126], "Detached ADU"],
        ...(plan.units.some((u) => u.name === "AADU") ? ([[[169, 207, 196], "Attached ADU"]] as [RGB, string][]) : []),
        [[30, 110, 80], `Buildable envelope (${plan.setbacks.side} ft side, ${plan.setbacks.rear ? `${plan.setbacks.rear} ft rear` : "none on the alley"})`],
        [[185, 87, 63], "Setback / 5 ft from the house"],
        [[23, 36, 29], "Existing structure"],
        [[207, 217, 211], "Street"],
      ];
      font(7.5);
      let kx = M;
      room(6);
      for (const [c, label] of key) {
        const lw = pdf.getTextWidth(clean(label)) + 9;
        if (kx + lw > PW - M) {
          kx = M;
          y += 5;
          room(6);
        }
        pdf.setFillColor(c[0], c[1], c[2]);
        pdf.setDrawColor(INK[0], INK[1], INK[2]);
        pdf.setLineWidth(0.15);
        pdf.rect(kx, y, 3.2, 2.4, "FD");
        color(SLATE);
        pdf.text(clean(label), kx + 4.6, y + 2);
        kx += lw + 3;
      }
      y += 6;
    }
  } else {
    text("Parcel geometry is not available for this address, so the master plan could not be drawn.", { c: SLATE, gap: 2 });
  }

  /* ---- the units, with their numbers and rule checks ---- */
  if (plan && plan.units.length) {
    heading("Proposed units");
    for (const u of plan.units) {
      room(24);
      text(`${u.long}: ${u.w}' x ${u.d}'`, { bold: true, size: 10.5, gap: 0 });
      text(`${u.footprint.toLocaleString("en-US")} sf footprint. Living area ${u.living.toLocaleString("en-US")} sf of ${u.maxLiving.toLocaleString("en-US")} sf allowed${u.name === "DADU" ? ` (${plan.stories} ${plan.stories === 1 ? "story" : "stories"})` : ""}.`, { size: 9, c: SLATE, gap: 0.5 });
      if (u.plan) {
        text(`Pre-approved design: ${u.plan.name} by ${u.plan.designer}. ${u.plan.sqft.toLocaleString("en-US")} sf, ${u.plan.beds === "Studio" ? "studio" : `${u.plan.beds} bed`}, ${u.plan.baths} bath. Footprint ${u.plan.widthFt} x ${u.plan.depthFt} ft${u.plan.approx ? " (approximate)" : ""}. Plans: ${u.plan.detailUrl}`, { size: 8.5, c: SLATE, gap: 0.5 });
        text("The City makes no warranty about a pre-approved design or its suitability for a property; rely on the designer for that.", { size: 8, c: SLATE, gap: 0.5 });
      }
      for (const c of u.checks) bullet(c.text, c.ok ? GREEN : RED, c.ok ? "+" : "!");
      y += 1;
    }
    for (const w of plan.warnings) bullet(w, RED, "!");
    text(`Combined living area for the return estimate: ${plan.totalLiving.toLocaleString("en-US")} sf.`, { size: 9, bold: true, gap: 1 });
    if (plan.notes) text(plan.notes.trim(), { size: 8.5, c: SLATE, gap: 1 });
    text("A sketch to get a feel for the lot, not a design.", { size: 8, c: SLATE, gap: 1 });
  }

  /* ---- section ---- */
  if (sectionImg) {
    heading("Section through the lot", "Ground profile from the front lot line to the rear, through the cottage.");
    image(sectionImg, 80);
  }

  /* ---- facts, scenarios, constraints, risks ---- */
  heading("Property facts");
  for (const f of report.property_facts) {
    const v = f.unit === "%" ? `${Math.round(f.value)}%` : f.unit === "sf" ? sf(f.value) : `${Math.round(f.value)} ${f.unit}`;
    bullet(`${f.label}: ${v}${f.provenance?.source_layer ? ` (${f.provenance.source_layer})` : ""}`);
  }

  heading("Scenarios", "Only the single cottage has a score today. The others show what is allowed, not a verdict.");
  for (const sc of report.scenarios) {
    const bits = [sc.verdict, sc.units != null ? `${sc.units} ${sc.units === 1 ? "home" : "homes"}` : null, sc.max_buildable_sf ? sf(sc.max_buildable_sf.value) : null, sc.construction_cost_usd ? `${usd(sc.construction_cost_usd.value)} construction only` : null].filter(Boolean);
    room(16);
    text(SCENARIO_NAMES[sc.id] ?? sc.id, { bold: true, gap: 0 });
    text(`${bits.join("  |  ")}${bits.length ? ". " : ""}${sc.note}`, { size: 9, c: SLATE, gap: 1.5 });
  }

  heading("Site constraints");
  for (const c of report.site_constraints) bullet(`${c.label} ${c.detail}`);

  heading("Ranked risks", "Hard prohibitions come first.");
  if (!report.risks.length) text("No risks flagged.", { c: SLATE });
  report.risks.forEach((r, i) => bullet(`${r.title}${r.hard_prohibition ? "  [Blocks the project]" : ""}${r.citations.length === 0 ? "  (unverified)" : ""}`, r.hard_prohibition ? RED : INK, `${i + 1}.`));

  heading("Code citations", "Current Seattle code wins over ADUniverse. Citations stay unverified until checked against the code text.");
  for (const c of report.citations) bullet(`${c.section}: ${c.status === "verified" ? `verified ${c.effective_from ?? ""}` : "unverified"}`);

  heading("Survey required", "Nothing in public data can settle these.");
  for (const g of report.survey_required) bullet(g);

  heading("Data sources");
  for (const d of report.data_pulled) bullet(`${d.layer}, queried ${new Date(d.provenance.pulled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  y += 2;
  text(`Preliminary estimate. Not a permit or legal opinion. Cost is construction only, estimated at ${usd(COST_PER_SF)} per buildable sf.`, { size: 8, c: SLATE });

  /* ---- page footers ---- */
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    font(7.5);
    color(SLATE);
    pdf.text(clean(`Pencil  |  ${slim.streetLine || slim.address}  |  ${generated}`), M, PH - 8);
    pdf.text(`Page ${i} of ${pages}`, PW - M, PH - 8, { align: "right" });
  }
  return pdf;
}

export const reportPdfName = (address: string) => `pencil-dadu-feasibility-${address.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "lot"}.pdf`;
