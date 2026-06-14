import { propertyPhoto, zillowUrl } from "@/lib/property-image";

export { zillowUrl };

export type Verdict = "PENCILS" | "TIGHT" | "NO";

export interface Parcel {
  id: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  listPrice: number;
  zoning: string;
  unitsUnlocked: number;
  bestUse: string;
  allInCost: number;
  projectedValue: number;
  marginPct: number;
  verdict: Verdict;
  lotSqft: number;
  nearTransit: boolean;
  /** Days on market (sample). */
  dom: number;
  photo: string;
}

/** Verdict from margin — keeps pins/pills consistent everywhere. */
export function verdictFromMargin(marginPct: number): Verdict {
  if (marginPct >= 15) return "PENCILS";
  if (marginPct >= 8) return "TIGHT";
  return "NO";
}

function photoFor(id: string): string {
  return `https://picsum.photos/seed/pencil-${id}/640/420`;
}

/** ~10 sample Seattle / Puget Sound parcels (approximate coords — sample data). */
const baseParcels: Parcel[] = [
  {
    id: "ballard-62nd",
    address: "4214 NW 62nd St",
    neighborhood: "Ballard",
    lat: 47.672,
    lng: -122.385,
    listPrice: 1_250_000,
    zoning: "NR2",
    unitsUnlocked: 6,
    bestUse: "6-unit stacked flats",
    allInCost: 2_410_000,
    projectedValue: 3_180_000,
    marginPct: 24.1,
    verdict: "PENCILS",
    lotSqft: 6003,
    nearTransit: true,
    dom: 5,
    photo: photoFor("ballard-62nd"),
  },
  {
    id: "greenwood-102nd",
    address: "312 N 102nd St",
    neighborhood: "Greenwood",
    lat: 47.701,
    lng: -122.355,
    listPrice: 920_000,
    zoning: "NR1",
    unitsUnlocked: 4,
    bestUse: "4 townhomes",
    allInCost: 1_740_000,
    projectedValue: 2_180_000,
    marginPct: 19.8,
    verdict: "PENCILS",
    lotSqft: 5200,
    nearTransit: false,
    dom: 12,
    photo: photoFor("greenwood-102nd"),
  },
  {
    id: "beacon-bennett",
    address: "1107 S Bennett St",
    neighborhood: "Beacon Hill",
    lat: 47.56,
    lng: -122.311,
    listPrice: 880_000,
    zoning: "NR1",
    unitsUnlocked: 4,
    bestUse: "4 townhomes",
    allInCost: 1_620_000,
    projectedValue: 2_050_000,
    marginPct: 21.0,
    verdict: "PENCILS",
    lotSqft: 4800,
    nearTransit: true,
    dom: 3,
    photo: photoFor("beacon-bennett"),
  },
  {
    id: "delridge-16th",
    address: "5530 16th Ave SW",
    neighborhood: "Delridge",
    lat: 47.555,
    lng: -122.362,
    listPrice: 790_000,
    zoning: "NR2",
    unitsUnlocked: 6,
    bestUse: "6-unit stacked flats",
    allInCost: 2_050_000,
    projectedValue: 2_460_000,
    marginPct: 17.2,
    verdict: "PENCILS",
    lotSqft: 6500,
    nearTransit: false,
    dom: 21,
    photo: photoFor("delridge-16th"),
  },
  {
    id: "wallingford-densmore",
    address: "4127 Densmore Ave N",
    neighborhood: "Wallingford",
    lat: 47.659,
    lng: -122.333,
    listPrice: 1_100_000,
    zoning: "NR1",
    unitsUnlocked: 4,
    bestUse: "4-plex",
    allInCost: 1_980_000,
    projectedValue: 2_340_000,
    marginPct: 15.4,
    verdict: "PENCILS",
    lotSqft: 5000,
    nearTransit: true,
    dom: 8,
    photo: photoFor("wallingford-densmore"),
  },
  {
    id: "columbia-edmunds",
    address: "3811 S Edmunds St",
    neighborhood: "Columbia City",
    lat: 47.56,
    lng: -122.286,
    listPrice: 840_000,
    zoning: "NR2",
    unitsUnlocked: 6,
    bestUse: "6 townhomes",
    allInCost: 1_910_000,
    projectedValue: 2_200_000,
    marginPct: 13.1,
    verdict: "TIGHT",
    lotSqft: 5600,
    nearTransit: true,
    dom: 33,
    photo: photoFor("columbia-edmunds"),
  },
  {
    id: "phinney-phinney",
    address: "6020 Phinney Ave N",
    neighborhood: "Phinney Ridge",
    lat: 47.673,
    lng: -122.354,
    listPrice: 1_050_000,
    zoning: "NR1",
    unitsUnlocked: 4,
    bestUse: "4-plex",
    allInCost: 1_920_000,
    projectedValue: 2_210_000,
    marginPct: 12.6,
    verdict: "TIGHT",
    lotSqft: 4700,
    nearTransit: false,
    dom: 41,
    photo: photoFor("phinney-phinney"),
  },
  {
    id: "edmonds-244th",
    address: "8320 244th St SW",
    neighborhood: "Edmonds",
    lat: 47.811,
    lng: -122.377,
    listPrice: 620_000,
    zoning: "RS-8",
    unitsUnlocked: 2,
    bestUse: "SFR + DADU",
    allInCost: 740_000,
    projectedValue: 860_000,
    marginPct: 9.4,
    verdict: "TIGHT",
    lotSqft: 8000,
    nearTransit: false,
    dom: 54,
    photo: photoFor("edmonds-244th"),
  },
  {
    id: "rainier-57th",
    address: "9243 57th Ave S",
    neighborhood: "Rainier Beach",
    lat: 47.516,
    lng: -122.265,
    listPrice: 690_000,
    zoning: "NR2",
    unitsUnlocked: 6,
    bestUse: "6-unit stacked flats",
    allInCost: 1_880_000,
    projectedValue: 2_020_000,
    marginPct: 6.9,
    verdict: "NO",
    lotSqft: 6100,
    nearTransit: false,
    dom: 67,
    photo: photoFor("rainier-57th"),
  },
  {
    id: "westseattle-42nd",
    address: "4520 42nd Ave SW",
    neighborhood: "West Seattle Junction",
    lat: 47.562,
    lng: -122.385,
    listPrice: 1_300_000,
    zoning: "LR1",
    unitsUnlocked: 8,
    bestUse: "8-unit stacked flats",
    allInCost: 2_950_000,
    projectedValue: 3_620_000,
    marginPct: 18.5,
    verdict: "PENCILS",
    lotSqft: 7200,
    nearTransit: true,
    dom: 6,
    photo: photoFor("westseattle-42nd"),
  },
];

/** Real aerial/street imagery per parcel, derived from its coordinates. */
export const parcels: Parcel[] = baseParcels.map((p) => ({
  ...p,
  photo: propertyPhoto(p.address, p.lat, p.lng),
}));

export function getParcel(id: string): Parcel | undefined {
  return parcels.find((p) => p.id === id);
}

export const ALL_ZONING = ["NR1", "NR2", "RSL", "LR", "RS-8", "LR1"] as const;
export const USE_OPTIONS = [
  "4-plex",
  "townhomes",
  "SFR + DADU",
  "stacked flats",
  "cottage cluster",
] as const;
