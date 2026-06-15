import type { ListingsProvider } from "./provider";
import { MockListingsProvider } from "./mock";
import { MlsGridProvider } from "./mlsgrid";

export type { ListingQuery, RawListing, ListingsProvider } from "./provider";

/**
 * Active provider. Swap with one env var: LISTINGS_PROVIDER=mock|mlsgrid.
 * Defaults to mock so the app runs without an MLS data agreement.
 */
let provider: ListingsProvider | null = null;

export function getListingsProvider(): ListingsProvider {
  if (provider) return provider;
  const which = (process.env.LISTINGS_PROVIDER ?? "mock").toLowerCase();
  provider = which === "mlsgrid" ? new MlsGridProvider() : new MockListingsProvider();
  return provider;
}
