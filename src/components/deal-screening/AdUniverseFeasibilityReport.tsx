"use client";

import type { ReactNode } from "react";
import type { FeasibilityData, FeasibilityResult } from "@/lib/feasibility";
import { buildAdUniverseFeasibilityPanel } from "@/lib/aduniverse-feasibility-panel";
import {
  fmtEm,
  fmtFt,
  fmtFtApprox,
  fmtInt,
  fmtPercent,
  fmtSqft,
  fmtSqftShort,
  fmtYesNo,
} from "@/lib/aduniverse-gis-format";

const SMC_2344041 =
  "https://library.municode.com/wa/seattle/codes/code_of_ordinances?nodeId=TIT23LANDUSAND_PLANDE_CH23.44RESNCODE";

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[1fr_auto] sm:gap-x-8 sm:items-baseline border-b border-zinc-200/80 last:border-b-0">
      <span className="text-[15px] text-zinc-600">{label}</span>
      <span className="text-[15px] font-medium text-zinc-900 tabular-nums text-left sm:text-right">
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mt-10 mb-4 first:mt-0">
      {children}
    </h2>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-[15px] leading-relaxed text-zinc-700">{children}</div>;
}

function describeZoning(zoning: string | null): { headline: string; body: string } {
  const raw = zoning?.trim() ?? "";
  const z = raw.toUpperCase();
  if (!raw) {
    return {
      headline: "Zoning: —",
      body: "Zoning was not returned from the parcel layer. Verify in ADUniverse or City GIS.",
    };
  }
  if (z.startsWith("NR")) {
    return {
      headline: `Zoning: ${raw}`,
      body: "This property is in a Neighborhood Residential (NR) zone. ADUs are allowed in Neighborhood Residential (NR), Residential Small Lot (RSL), and Lowrise (LR) zones.",
    };
  }
  if (z.startsWith("RSL")) {
    return {
      headline: `Zoning: ${raw}`,
      body: "This property is in a Residential Small Lot (RSL) zone. ADUs are allowed in Neighborhood Residential (NR), Residential Small Lot (RSL), and Lowrise (LR) zones.",
    };
  }
  if (z.startsWith("LR")) {
    return {
      headline: `Zoning: ${raw}`,
      body: "This property is in a Lowrise (LR) zone. ADUs are allowed in Neighborhood Residential (NR), Residential Small Lot (RSL), and Lowrise (LR) zones.",
    };
  }
  return {
    headline: `Zoning: ${raw}`,
    body: `Zoning is reported as ${raw}. Confirm whether ADUs are permitted with Seattle Land Use Code Chapter 23.44 and SDCI.`,
  };
}

function existingADUsNarrative(f: FeasibilityData | null): { title: string; body: string } {
  if (!f) {
    return {
      title: "Existing ADUs: —",
      body: "No feasibility factors record was returned for this location.",
    };
  }
  const total = f.totalADU;
  const aadu = f.existingAADU ?? 0;
  const dadu = f.existingDADU ?? 0;
  const hasNone =
    (total == null || total === 0) && aadu === 0 && dadu === 0;

  if (hasNone) {
    return {
      title: "Existing ADUs: none on record",
      body: "According to the ADUniverse feasibility factors layer, this property does not show an ADU on record. Lots in eligible Seattle zones may have up to two ADUs under current code; confirm permit history with SDCI.",
    };
  }

  const titleParts: string[] = [];
  if (f.existingAADU != null) titleParts.push(`${fmtInt(f.existingAADU)} AADU`);
  if (f.existingDADU != null) titleParts.push(`${fmtInt(f.existingDADU)} DADU`);
  const title =
    titleParts.length > 0
      ? `Existing ADUs: ${titleParts.join(", ")}`
      : `Existing ADUs: ${fmtInt(total)} total (GIS)`;

  return {
    title,
    body: `The feasibility factors layer reports AADU_COUNT: ${fmtInt(f.existingAADU)}, DADU_COUNT: ${fmtInt(f.existingDADU)}, ADU_TOTAL: ${fmtInt(f.totalADU)}. Confirm against actual permits.`,
  };
}

function lotTypeNarrative(lotType: string | null, hasAlley: boolean): string {
  const lt = (lotType ?? "").toLowerCase();
  if (lt === "interior") {
    return hasAlley
      ? "This appears to be an interior lot with neighbors on its sides, but the adjacent alley might provide another option for access to an ADU."
      : "This appears to be an interior lot with neighbors on its sides.";
  }
  if (lt === "corner") {
    return "This appears to be a corner lot, which can improve construction access and layout options for an ADU.";
  }
  if (lotType) {
    return `The feasibility factors layer reports lot type: ${lotType}.`;
  }
  return "Lot type was not returned in the feasibility factors layer.";
}

function heightBracketCopy(widthFt: number | null): string {
  if (widthFt == null || !Number.isFinite(widthFt)) {
    return "Maximum DADU height depends on lot width under Section 23.44.041. Lot width from the feasibility layer was not available.";
  }
  if (widthFt < 30) {
    return `The feasibility factors layer reports lot width (MBG) of about ${widthFt} feet (less than 30 ft). See the height table below for base and roof allowances.`;
  }
  if (widthFt < 40) {
    return `The feasibility factors layer reports lot width (MBG) of about ${widthFt} feet (30 up to 40 ft). See the height table below.`;
  }
  if (widthFt < 50) {
    return `The feasibility factors layer reports lot width (MBG) of about ${widthFt} feet (40 up to 50 ft). The lot width appears to be near a bracket boundary; a survey may be necessary to determine the exact width. See the height table below.`;
  }
  return `The feasibility factors layer reports lot width (MBG) of about ${widthFt} feet (50 ft or greater). See the height table below.`;
}

function DaduHeightTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200">
      <table className="w-full text-left text-sm text-zinc-800">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="p-3 font-semibold">Maximum DADU height (in feet)</th>
            <th className="p-3 font-semibold text-center">Lot width &lt; 30</th>
            <th className="p-3 font-semibold text-center">30 up to 40</th>
            <th className="p-3 font-semibold text-center">40 up to 50</th>
            <th className="p-3 font-semibold text-center">50 or greater</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-zinc-100">
            <td className="p-3">Base structure height limit</td>
            <td className="p-3 text-center tabular-nums">14</td>
            <td className="p-3 text-center tabular-nums">16</td>
            <td className="p-3 text-center tabular-nums">18</td>
            <td className="p-3 text-center tabular-nums">18</td>
          </tr>
          <tr className="border-b border-zinc-100">
            <td className="p-3">Additional height allowed for pitched roof</td>
            <td className="p-3 text-center tabular-nums">3</td>
            <td className="p-3 text-center tabular-nums">7</td>
            <td className="p-3 text-center tabular-nums">5</td>
            <td className="p-3 text-center tabular-nums">7</td>
          </tr>
          <tr>
            <td className="p-3">Additional height allowed for shed or butterfly roof</td>
            <td className="p-3 text-center tabular-nums">3</td>
            <td className="p-3 text-center tabular-nums">4</td>
            <td className="p-3 text-center tabular-nums">4</td>
            <td className="p-3 text-center tabular-nums">4</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function AdUniverseFeasibilityReport({ result }: { result: FeasibilityResult }) {
  const panel = buildAdUniverseFeasibilityPanel(result);
  const p = result.parcel;
  const f = result.feasibility;
  const z = describeZoning(p?.zoning ?? null);
  const adu = existingADUsNarrative(f);

  const lotSizeLine =
    p?.lotSqft != null && Number.isFinite(p.lotSqft) ? fmtSqft(p.lotSqft) : "—";

  const coveragePct = fmtPercent(f?.lotCoveragePercent ?? null);
  const overCov = f?.lotCoverageOver;
  const overCovText =
    overCov === true
      ? "The feasibility factors layer flags this lot as over the lot coverage limit (LOTCOV_OVER)."
      : overCov === false
        ? "The feasibility factors layer does not flag this lot as over the maximum lot coverage limit (LOTCOV_OVER)."
        : "Lot coverage over-limit flag was not returned (LOTCOV_OVER).";

  const widthContext =
    "The Land Use Code often requires about 25 feet of lot width for a new DADU; on narrower lots, converting an existing accessory structure may be allowed. Compare the GIS width above to code and a site survey.";

  const depthContext =
    "The Land Use Code often requires about 70 feet of lot depth for a new DADU; on shallower lots, converting an existing accessory structure may be allowed. Compare the GIS depth above to code and a site survey.";

  const dims =
    f?.lotWidth != null && f?.lotDepth != null
      ? `${fmtInt(f.lotWidth)} × ${fmtInt(f.lotDepth)} ft (MBG)`
      : "—";

  if (!panel.hasParcelLayer && !panel.hasFactorsLayer) {
    return (
      <div className="bg-[#f4f4f5] px-4 py-12 text-center text-zinc-600">
        No ADUniverse parcel or feasibility record was returned for this location.
      </div>
    );
  }

  return (
    <div className="bg-[#f4f4f5] text-zinc-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section aria-labelledby="property-facts-heading">
          <h2 id="property-facts-heading" className="text-2xl font-semibold text-zinc-900 mb-1">
            Property information
          </h2>
          <p className="text-sm text-zinc-600 mb-4">
            GIS fields from Seattle ADUniverse parcel and feasibility factors layers—shown as
            returned, without extra coverage or DADU size calculations.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { k: "Lot size", v: fmtSqftShort(p?.lotSqft ?? null) },
              { k: "Zoning", v: fmtEm(p?.zoning) },
              { k: "Year built", v: fmtEm(p?.yearBuilt) },
              { k: "PIN", v: fmtEm(p?.pin) },
              { k: "Developable (non-shore)", v: fmtSqftShort(p?.developableAreaSqft ?? null) },
              { k: "Lot W × D (MBG)", v: dims },
              { k: "Lot coverage (GIS)", v: fmtPercent(f?.lotCoveragePercent ?? null) },
              { k: "Total bldg sq ft", v: fmtSqftShort(f?.totalBuildingSqft ?? null) },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm text-center sm:text-left"
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {s.k}
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-900 tabular-nums break-words">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
              <h3 className="text-sm font-semibold text-zinc-900">Facts & features — full layer values</h3>
            </div>
            <div className="px-4 py-1 space-y-0">
              {panel.groups.map((g) => (
                <div key={g.id} className="py-4 border-b border-zinc-100 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                    {g.title}
                  </p>
                  {g.subtitle ? (
                    <p className="text-xs text-zinc-500 mb-3">{g.subtitle}</p>
                  ) : null}
                  {g.rows.map((row, i) => (
                    <FactRow key={`${g.id}-${row.label}-${i}`} label={row.label} value={row.value} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <SectionTitle>Requirements for all ADUs</SectionTitle>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{z.headline}</h3>
              <Prose>
                <p>{z.body}</p>
              </Prose>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{adu.title}</h3>
              <Prose>
                <p>{adu.body}</p>
              </Prose>
            </div>
          </div>

          <SectionTitle>Additional requirements for a DADU</SectionTitle>
          <Prose>
            <p>
              For detailed development standards, see Seattle&apos;s ADU ordinance in{" "}
              <a
                href={SMC_2344041}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
              >
                Section 23.44.041
              </a>{" "}
              of the Land Use Code.
            </p>
          </Prose>

          <div className="mt-8 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Lot size</h3>
              <Prose>
                <p className="text-zinc-900 font-medium">{lotSizeLine}</p>
                <p>
                  The minimum lot area to construct a DADU in many cases is 3,200 square feet under
                  the Land Use Code. On smaller lots, converting an existing accessory structure (for
                  example a detached garage) may be allowed. The size above is{" "}
                  <strong>SQFTLOT</strong> from the parcel layer.
                </p>
              </Prose>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Lot coverage</h3>
              <Prose>
                <p className="text-zinc-900 font-medium">{coveragePct}</p>
                <p>{overCovText}</p>
                <p>
                  Total footprint of existing structures from the feasibility layer (
                  <strong>TOT_SQFT</strong>): {fmtSqftShort(f?.totalBuildingSqft ?? null)}.
                </p>
                <p>
                  Developable land (non-shore) from the parcel layer (
                  <strong>LAND_NO_SHORE_SQFT</strong>): {fmtSqftShort(p?.developableAreaSqft ?? null)}.
                </p>
                <p className="text-sm text-zinc-600">
                  This display uses City GIS fields only. It does not compute maximum allowed coverage
                  or remaining coverage. A more detailed site survey may be required as part of
                  permitting.
                </p>
              </Prose>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Lot width</h3>
              <Prose>
                <p className="text-zinc-900 font-medium">{fmtFtApprox(f?.lotWidth ?? null)}</p>
                <p>{widthContext}</p>
                <p>
                  Width above is <strong>MBG_Width</strong> from the feasibility factors layer.
                </p>
                <p>{heightBracketCopy(f?.lotWidth ?? null)}</p>
              </Prose>
              <DaduHeightTable />
              <Prose>
                <p className="text-sm mt-3">
                  For more detail on height limits and other standards, review{" "}
                  <a
                    href={SMC_2344041}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  >
                    Section 23.44.041
                  </a>{" "}
                  of the Land Use Code.
                </p>
              </Prose>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Lot depth</h3>
              <Prose>
                <p className="text-zinc-900 font-medium">{fmtFtApprox(f?.lotDepth ?? null)}</p>
                <p>{depthContext}</p>
                <p>
                  Depth above is <strong>MBG_Length</strong> from the feasibility factors layer.
                </p>
              </Prose>
            </div>
          </div>

          <SectionTitle>Characteristics of this property</SectionTitle>
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 mb-1">
                {f?.lotType ? `${f.lotType} lot` : "Lot type"}
              </h3>
              <Prose>
                <p>{lotTypeNarrative(f?.lotType ?? null, f?.hasAlley ?? false)}</p>
              </Prose>
            </div>
            {f?.hasAlley ? (
              <div>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">Alley</h3>
                <Prose>
                  <p>
                    This lot has alley access (ALLEY in the feasibility factors layer), which can
                    offer privacy and a secondary access route for an ADU or tenants.
                  </p>
                </Prose>
              </div>
            ) : null}
            <div>
              <h3 className="text-base font-semibold text-zinc-900 mb-1">Tree canopy</h3>
              <Prose>
                <p>
                  This property shows tree canopy coverage of about{" "}
                  <strong>{fmtPercent(f?.treeCanopyPercent ?? null)}</strong> in the feasibility
                  factors layer (<strong>TREE_CANOPY_PC</strong>). Seattle tree rules may limit
                  removal and require permits or replacement planting; see Section 23.44.020 and
                  SDCI.
                </p>
              </Prose>
            </div>
            {f ? (
              <div>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">
                  Environmental &amp; critical areas (GIS)
                </h3>
                <Prose>
                  <p>
                    Steep slope: {fmtPercent(f.steepSlopePercent)} (area{" "}
                    {fmtSqftShort(f.steepSlopeArea)}). Wetland: {fmtPercent(f.wetlandPercent)} (area {fmtSqftShort(f.wetlandArea)}).
                    Riparian: {fmtPercent(f.riparianPercent)} (area {fmtSqftShort(f.riparianArea)}).
                    Wildlife: {fmtPercent(f.wildlifePercent)} (area {fmtSqftShort(f.wildlifeArea)}).
                    Flood-prone: {fmtYesNo(f.floodProne)}; liquefaction: {fmtYesNo(f.liquefaction)};
                    known slide: {fmtYesNo(f.knownSlide)}; potential slide:{" "}
                    {fmtYesNo(f.potentialSlide)}; peat: {fmtYesNo(f.peat)}; landfill:{" "}
                    {fmtYesNo(f.landfill)}; shoreline:{" "}
                    {fmtEm(f.shoreline)}.
                  </p>
                </Prose>
              </div>
            ) : null}
            {f && (f.detachedGarageCount ?? 0) > 0 ? (
              <div>
                <h3 className="text-base font-semibold text-zinc-900 mb-1">Detached garage</h3>
                <Prose>
                  <p>
                    GIS reports {fmtInt(f.detachedGarageCount)} detached garage(s),{" "}
                    {fmtSqftShort(f.detachedGarageSqft)} (COUNT_DETGAR, SIZE_DETGAR).
                  </p>
                </Prose>
              </div>
            ) : null}
          </div>

          <SectionTitle>Are there ADUs near you?</SectionTitle>
          <Prose>
            <p>
              Within <strong>1,320 feet</strong> (¼ mile), the feasibility factors layer reports{" "}
              <strong>{fmtInt(f?.nearbyAADU ?? null)}</strong> AADUs and{" "}
              <strong>{fmtInt(f?.nearbyDADU ?? null)}</strong> DADUs (AADU_NEAR_1320, DADU_NEAR_1320).
            </p>
            <p>
              Nearest AADU distance (NEAREST1AADU_DIST): {fmtFt(f?.nearestAADUDist ?? null)}. Nearest
              DADU distance (NEAREST1DADU_DIST): {fmtFt(f?.nearestDADUDist ?? null)}.
            </p>
          </Prose>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed max-w-3xl">
          Preliminary information from Seattle City GIS / ADUniverse layers. Not a final
          determination, legal advice, or permit approval. Verify all details with SDCI and
          qualified professionals.
        </p>
      </div>
    </div>
  );
}
