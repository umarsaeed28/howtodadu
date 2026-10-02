import type { Candidate } from "@/lib/server/candidates";
import type { RawListing } from "@/lib/listings";
import type { AduniverseFacts } from "@/lib/server/aduniverse";
import { ecaFlagsOf, scoreSite, type SiteScore } from "@/lib/dadu-score";

/** The site score for a listing's lot: the same inputs the AI review and the report use, so every page shows one number. */
export function siteScoreFor(l: Pick<RawListing, "hoaMonthly">, lot: Candidate | null, adu: AduniverseFacts | null): SiteScore | null {
  if (!lot) return null;
  return scoreSite({
    lotSqft: lot.lotSqft, widthFt: lot.lotWidth ?? adu?.raw.lotWidth ?? null, depthFt: lot.lotDepth ?? adu?.raw.lotDepth ?? null,
    alley: lot.alley, corner: lot.corner, daduSqft: lot.daduSqft, steepPct: lot.steepPct, canopyPct: lot.canopyPct,
    ecaFlags: ecaFlagsOf(adu?.raw), existingAdus: lot.existingAdus ?? adu?.raw.totalADU ?? null, sideClearanceFt: lot.sideClearanceFt ?? null, zoning: lot.zoning, hoaMonthly: l.hoaMonthly ?? null, trees: lot.trees ?? null,
  });
}
