import type { Verdict } from "@/lib/parcels";
import { propertyPhoto, zillowUrl } from "@/lib/property-image";

/** Pencil-style verdict from the DADU score (0-100).
 *  >= 70 pencils, 50-69 tight, < 50 no. Keeps card pills and filters consistent. */
export function verdictFromScore(score: number): Verdict {
  if (score >= 70) return "PENCILS";
  if (score >= 50) return "TIGHT";
  return "NO";
}

/** Real photo of the property (Street View when keyed, else aerial). */
export const feasPhoto = propertyPhoto;

export { zillowUrl };
