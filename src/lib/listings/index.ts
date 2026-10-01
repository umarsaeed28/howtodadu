import type { ListingsProvider } from "./provider";
import { NoListingsProvider } from "./none";
import { FixtureListingsProvider } from "./fixture";
import { MlsGridProvider } from "./mlsgrid";
import { SparkProvider } from "./spark";

export type { ListingQuery, RawListing, ListingsProvider } from "./provider";

export type ProviderName = "none" | "fixture" | "flex" | "mlsgrid";

/** Active provider name. LISTINGS_PROVIDER=none|fixture|flex|mlsgrid, default none. */
export function listingsProviderName(): ProviderName {
  const which = (process.env.LISTINGS_PROVIDER ?? "none").toLowerCase();
  if (which === "flex" || which === "spark") return "flex";
  if (which === "mlsgrid") return "mlsgrid";
  if (which === "fixture") return "fixture";
  return "none";
}

let provider: ListingsProvider | null = null;
let providerFor: ProviderName | null = null;

export function getListingsProvider(): ListingsProvider {
  const name = listingsProviderName();
  if (provider && providerFor === name) return provider;
  provider =
    name === "flex"
      ? new SparkProvider()
      : name === "mlsgrid"
        ? new MlsGridProvider()
        : name === "fixture"
          ? new FixtureListingsProvider()
          : new NoListingsProvider();
  providerFor = name;
  return provider;
}

/** True when a real MLS feed (not the empty default) is configured. */
export function listingsConnected(): boolean {
  const n = listingsProviderName();
  return n === "flex" || n === "mlsgrid" || n === "fixture";
}
