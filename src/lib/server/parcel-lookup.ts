import "server-only";
import { getLot } from "@/lib/server/lot-library-store";

const PARCELS_URL = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/ADUniverse_parcels/FeatureServer/0/query";

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ne|Nw|Se|Sw|N|S|E|W)\b/g, (m) => m.toUpperCase()).replace(/(\d)(St|Nd|Rd|Th)\b/g, (_, d, x) => d + x.toLowerCase());

/**
 * A King County parcel number (PIN) to its street address, so a journey that only carries ?parcel= can run the
 * feasibility engine. The lot library answers most Seattle lots; the city's parcel layer covers the rest.
 */
export async function resolveParcel(pin: string): Promise<{ pin: string; address: string } | null> {
  if (!/^\d{10}$/.test(pin)) return null;
  const lot = getLot(pin);
  if (lot?.address) return { pin, address: `${titleCase(lot.address)}, Seattle, WA` };
  try {
    const params = new URLSearchParams({ where: `PIN='${pin}'`, outFields: "PIN,ADDRESS", returnGeometry: "false", f: "json" });
    const res = await fetch(`${PARCELS_URL}?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { attributes?: { ADDRESS?: string } }[] };
    const a = data.features?.[0]?.attributes?.ADDRESS?.replace(/\s+/g, " ").trim();
    return a ? { pin, address: `${titleCase(a)}, Seattle, WA` } : null;
  } catch {
    return null;
  }
}
