import { factorsToFeasibilityData } from "./factors-map";
import type { FeasibilityData } from "@/lib/feasibility";

const FACTORS_URL = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/ADUniverse_feasibility_factors/FeatureServer/0/query";

/** What ADUniverse (Seattle's ADU feasibility layer, 2021 vintage) says about one parcel, in words a buyer can use. */
export interface AduniverseFacts {
  pin: string;
  vintage: string;
  /** Plain-language lines, each one a fact the DADU read can cite. */
  lines: string[];
  raw: FeasibilityData;
}

const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v <= 1 ? v * 100 : v));
const dist = (m: number | null | undefined) => (m == null || m <= 0 ? null : `${Math.round(m * 3.281).toLocaleString("en-US")} ft`);

/** Fail-soft: returns null when the layer is down or the parcel is not in it. */
export async function getAduniverseFacts(pin: string): Promise<AduniverseFacts | null> {
  if (!/^\d{10}$/.test(pin)) return null;
  try {
    const q = new URLSearchParams({ where: `KCGIS_CGDB_PARCEL_SV_PIN='${pin}'`, outFields: "*", returnGeometry: "false", f: "json" });
    const res = await fetch(`${FACTORS_URL}?${q}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 43200 } });
    const data = await res.json();
    const attrs = data.features?.[0]?.attributes as Record<string, unknown> | undefined;
    if (!attrs) return null;
    const f = factorsToFeasibilityData(attrs);
    const lines: string[] = [];
    const adus = f.totalADU ?? 0;
    lines.push(adus ? `ADUniverse counts ${adus} existing ADU${adus === 1 ? "" : "s"} on this lot (${f.existingAADU ?? 0} attached, ${f.existingDADU ?? 0} detached). The cap is 2.` : "ADUniverse counts no existing ADUs on this lot, so both ADU slots are open.");
    const near = (f.nearbyDADU ?? 0) + (f.nearbyAADU ?? 0);
    lines.push(`Within a quarter mile: ${f.nearbyDADU ?? 0} DADUs and ${f.nearbyAADU ?? 0} attached ADUs (${near} total)${dist(f.nearestDADUDist) ? `; the nearest DADU is ${dist(f.nearestDADUDist)} away` : ""}.`);
    if (f.detachedGarageCount) lines.push(`${f.detachedGarageCount} detached garage${f.detachedGarageCount === 1 ? "" : "s"} on the lot${f.detachedGarageSqft ? `, ${Math.round(f.detachedGarageSqft).toLocaleString("en-US")} sf` : ""}: a possible garage conversion.`);
    else lines.push("No detached garage on record, so a DADU would be new construction.");
    if (f.basementSqft) lines.push(`Basement of ${Math.round(f.basementSqft).toLocaleString("en-US")} sf${f.daylightBasement === "Y" ? " with daylight windows, which suits an attached ADU" : ""}.`);
    if (f.lotCoveragePercent != null) lines.push(`Buildings cover ${pct(f.lotCoveragePercent)}% of the lot${f.lotCoverageOver ? ", over the coverage limit" : ""}.`);
    const eca = [f.steepSlopePercent && "steep slope", f.wetlandPercent && "wetland", f.wildlifePercent && "wildlife habitat", f.riparianPercent && "riparian corridor", f.floodProne && "flood-prone", f.liquefaction && "liquefaction zone", f.knownSlide && "known landslide", f.potentialSlide && "potential landslide", f.peat && "peat", f.landfill && "landfill"].filter(Boolean);
    lines.push(eca.length ? `Environmentally critical area flags: ${eca.join(", ")}.` : "No environmentally critical area flags in ADUniverse.");
    if (f.treeCanopyPercent != null) lines.push(`Tree canopy covers ${pct(f.treeCanopyPercent)}% of the lot.`);
    return { pin, vintage: "2021", lines, raw: f };
  } catch {
    return null;
  }
}

const PARCELS_URL = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/ADUniverse_parcels/FeatureServer/0/query";

/** Assessed values for a parcel (King County assessor data in the city's parcel layer). No owner names are returned. */
export interface ParcelValues {
  landAv: number | null;
  bldgAv: number | null;
  lotSqft: number | null;
}

export async function getParcelValues(pin: string): Promise<ParcelValues | null> {
  if (!/^\d{10}$/.test(pin)) return null;
  try {
    const q = new URLSearchParams({ where: `PIN='${pin}'`, outFields: "LAND_AV,BLDG_AV,SQFTLOT", returnGeometry: "false", f: "json" });
    const res = await fetch(`${PARCELS_URL}?${q}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 43200 } });
    const a = (await res.json()).features?.[0]?.attributes as Record<string, unknown> | undefined;
    if (!a) return null;
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return { landAv: n(a.LAND_AV), bldgAv: n(a.BLDG_AV), lotSqft: n(a.SQFTLOT) };
  } catch {
    return null;
  }
}
