export type Verdict = "PENCILS" | "TIGHT";

export interface SampleParcel {
  id: string;
  address: string;
  neighborhood: string;
  zoning: string;
  /** Headline unit unlock, e.g. "6 units". */
  unitYield: string;
  /** Short context shown after the unit yield. */
  unlockContext: string;
  bestUse: string;
  allInCost: string;
  projectedValue: string;
  /** Numeric margin used for the count-up, e.g. 24.1 means +24.1%. */
  margin: number;
  verdict: Verdict;
}

/** The three parcels that cycle through the signature Verdict Card. */
export const sampleParcels: SampleParcel[] = [
  {
    id: "ballard",
    address: "4214 NW 62ND ST, BALLARD",
    neighborhood: "BALLARD",
    zoning: "NR2",
    unitYield: "6 units",
    unlockContext: "within ¼mi transit",
    bestUse: "6-unit stacked flats",
    allInCost: "$2.41M",
    projectedValue: "$3.18M",
    margin: 24.1,
    verdict: "PENCILS",
  },
  {
    id: "beacon-hill",
    address: "1107 S BENNETT ST, BEACON HILL",
    neighborhood: "BEACON HILL",
    zoning: "NR1",
    unitYield: "4 units",
    unlockContext: "base entitlement",
    bestUse: "4 townhomes",
    allInCost: "$1.62M",
    projectedValue: "$2.05M",
    margin: 21.0,
    verdict: "PENCILS",
  },
  {
    id: "edmonds",
    address: "8320 244TH ST SW, EDMONDS",
    neighborhood: "EDMONDS",
    zoning: "RS-8",
    unitYield: "SFR + DADU",
    unlockContext: "lot-size limited",
    bestUse: "remodel + DADU",
    allInCost: "$0.74M",
    projectedValue: "$0.86M",
    margin: 9.4,
    verdict: "TIGHT",
  },
];

export interface DigestRow {
  address: string;
  unlock: string;
  units: string;
  margin: string;
}

/** The four rows in the mock morning-digest table. */
export const digestRows: DigestRow[] = [
  { address: "4214 NW 62ND ST, BALLARD", unlock: "NR2", units: "6", margin: "+24.1%" },
  { address: "312 N 102ND ST, GREENWOOD", unlock: "NR1", units: "4", margin: "+19.8%" },
  { address: "1107 S BENNETT ST, BEACON HILL", unlock: "NR1", units: "4", margin: "+21.0%" },
  { address: "5530 16TH AVE SW, DELRIDGE", unlock: "NR2", units: "6", margin: "+17.2%" },
];
