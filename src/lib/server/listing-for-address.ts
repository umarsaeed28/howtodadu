import { getListingsProvider, listingsConnected } from "@/lib/listings";
import { streetKey } from "@/lib/listings/address-key";
import { isForSale, isPending } from "@/lib/listings/status";
import { overrideFor, statusOverrides } from "@/lib/listings/status-overrides";
import type { ReportListing } from "@/lib/feasibility";

/** The current listing for a street address (and ZIP when known), from the cached feed. Null when it is not for sale. */
export async function listingForAddress(address: string, zip?: string | null): Promise<ReportListing | null> {
  if (!listingsConnected()) return null;
  try {
    const { listings } = await getListingsProvider().search({ city: "Seattle", pageSize: 1000 });
    const key = streetKey(address);
    const l = listings.find((x) => streetKey(x.address) === key && (!zip || !x.zip || x.zip === zip));
    if (!l) return null;
    const pending = !!overrideFor(statusOverrides(), l.address, l.zip) || isPending(l.status);
    if (!pending && !isForSale(l.status)) return null;
    return { mlsId: l.mlsId, price: l.listPrice, pending, daysOnMarket: l.daysOnMarket ?? null, beds: l.beds ?? null, baths: l.baths ?? null, livingSqft: l.livingSqft ?? null };
  } catch {
    return null;
  }
}
