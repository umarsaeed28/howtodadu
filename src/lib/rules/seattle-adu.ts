/**
 * Pencil's rulebook for Seattle DADUs and ADUs: every number the feasibility engine uses, in one place, with where it
 * comes from. The engine reads its numbers only from here; the knowledge base (rag/documents) is checked against it
 * (rulebook.test.ts), and rag/documents/22-pencil-rulebook.md is generated from it (npm run kb:rulebook).
 *
 *   kind "code"    a Seattle Municipal Code rule, with its section.
 *   kind "pencil"  Pencil's own screen or design assumption. Never presented as a city rule.
 *
 *   status "cited"       taken from the code section named, as summarized in Pencil's sources.
 *   status "unverified"  the number or its section is not yet confirmed against the code text.
 *
 * To change a rule: edit it here, update the documents the test names, run `npm run kb:rulebook`.
 */

export type RuleKind = "code" | "pencil";
export type RuleStatus = "cited" | "unverified";

export interface Rule<T> {
  label: string;
  value: T;
  unit?: string;
  kind: RuleKind;
  status: RuleStatus;
  /** Code section(s), for kind "code". */
  citation?: string;
  /** One or two plain sentences: what the rule says and how Pencil applies it. */
  summary: string;
  /** Knowledge-base documents that state this rule, each with phrases that must appear in it (rulebook.test.ts). */
  docs?: Record<string, string[]>;
}

const rule = <T>(r: Rule<T>): Rule<T> => r;

export const ADU = {
  maxPerLot: rule({
    label: "ADUs per lot", value: 2, kind: "code", status: "cited", citation: "SMC 23.42.022",
    summary: "Up to two ADUs on a lot with a principal dwelling unit, in any mix of attached, detached or stacked.",
    docs: { "20-adu-rules-smc-23-42-022": ["Up to two ADUs"] },
  }),
  maxGrossSqft: rule({
    label: "ADU size cap, 2 bedrooms or fewer", value: 1000, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.42.022.G.1.a",
    summary: "An ADU with two bedrooms or fewer may have up to 1,000 sq ft of gross floor area.",
    docs: { "20-adu-rules-smc-23-42-022": ["1,000 square feet"], "21-dadu-lot-feasibility-math": ["1,000 sq ft with two"] },
  }),
  maxGrossSqft3br: rule({
    label: "ADU size cap, 3 bedrooms or more", value: 1200, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.42.022.G.1.b",
    summary: "An ADU with three or more bedrooms may have up to 1,200 sq ft of gross floor area.",
    docs: { "20-adu-rules-smc-23-42-022": ["1,200 square feet"], "21-dadu-lot-feasibility-math": ["1,200 sq ft with three"] },
  }),
  garageExemptSqft: rule({
    label: "Attached garage left out of the ADU size cap", value: 250, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.42.022",
    summary: "Up to 250 sq ft of a garage attached to an ADU does not count toward its size cap; the rest of the garage does, and all of it counts toward lot coverage.",
    docs: { "20-adu-rules-smc-23-42-022": ["250 square feet of an attached garage"], "21-dadu-lot-feasibility-math": ["Up to 250 sq ft of a garage attached"] },
  }),
  bikeStorageExemptSqft: rule({
    label: "Long-term bike storage left out of the ADU size cap", value: 35, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.42.022",
    summary: "Up to 35 sq ft of long-term bike storage does not count toward an ADU's size cap.",
    docs: { "20-adu-rules-smc-23-42-022": ["35 square feet of long-term bike storage"] },
  }),
  undergroundExempt: rule({
    label: "Fully underground stories left out of the ADU size cap", value: true, kind: "code", status: "cited", citation: "SMC 23.42.022.G.2.b",
    summary: "Stories that are fully underground do not count toward an ADU's gross floor area.",
    docs: { "20-adu-rules-smc-23-42-022": ["fully underground"] },
  }),
  parkingRequired: rule({
    label: "Off-street parking for an ADU", value: false, kind: "code", status: "cited", citation: "SMC 23.42.022",
    summary: "No off-street parking is required for any ADU anywhere in Seattle.",
    docs: { "20-adu-rules-smc-23-42-022": ["No off-street parking is required"] },
  }),
  condoSale: rule({
    label: "ADU sold as a condominium", value: true, kind: "code", status: "cited", citation: "SMC 23.42.022",
    summary: "An individual ADU may be sold as a condominium unit.",
    docs: { "20-adu-rules-smc-23-42-022": ["sold as a condominium"] },
  }),
  minLotSqft: rule({
    label: "Code minimum lot size for a DADU", value: 0, unit: "sq ft", kind: "code", status: "cited", citation: "Ordinance 127211 (repealed SMC 23.44.041)",
    summary: "Seattle has no minimum lot size for a DADU since Ordinance 127211 repealed SMC 23.44.041 and its 3,200 sq ft, 25 ft by 70 ft table. Pencil's own screen is separate (see Pencil screens).",
    docs: { "31-lot-size-and-dimensions": ["no minimum lot size"] },
  }),
} as const;

/** NR floor area ratio by lot area per dwelling unit, densest last (SMC 23.44.050 Table A). */
export const NR_FAR_TABLE: readonly { lotPerUnitAboveSqft: number; far: number }[] = [
  { lotPerUnitAboveSqft: 4000, far: 0.6 }, // more than 4,000 sq ft per unit
  { lotPerUnitAboveSqft: 2200, far: 0.8 }, // 2,201 to 4,000
  { lotPerUnitAboveSqft: 1600, far: 1.0 }, // 1,601 to 2,200
  { lotPerUnitAboveSqft: -Infinity, far: 1.6 }, // 1,600 or less
];

export const NR = {
  maxLotCoverage: rule({
    label: "Lot coverage limit, Neighborhood Residential", value: 0.5, unit: "share of lot", kind: "code", status: "cited", citation: "SMC 23.44.080.A",
    summary: "Buildings may cover up to 50 percent of the lot. The old 1,000 sq ft plus 15 percent curve no longer applies.",
    docs: { "21-dadu-lot-feasibility-math": ["50 percent of the lot area"] },
  }),
  farTable: rule({
    label: "Floor area ratio by lot area per unit", value: NR_FAR_TABLE, kind: "code", status: "cited", citation: "SMC 23.44.050 Table A",
    summary: "FAR is 0.6 above 4,000 sq ft of lot per unit, 0.8 from 2,201 to 4,000, 1.0 from 1,601 to 2,200 and 1.6 at 1,600 or less. The house and every ADU count as units.",
    docs: { "21-dadu-lot-feasibility-math": ["| More than 4,000 sq ft | 0.6 |", "| 2,201 to 4,000 sq ft | 0.8 |", "| 1,601 to 2,200 sq ft | 1.0 |", "| 1,600 sq ft or less | 1.6 |"] },
  }),
  smallLotFloorSqft: rule({
    label: "Floor area always allowed on a lot under 5,000 sq ft", value: 2500, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.44.050.B",
    summary: "A lot under 5,000 sq ft may always have 2,500 sq ft of chargeable floor area, whatever the FAR gives.",
    docs: { "21-dadu-lot-feasibility-math": ["2,500 sq ft of chargeable"] },
  }),
  smallLotUnderSqft: rule({
    label: "Lot size below which the small-lot floor area applies", value: 5000, unit: "sq ft", kind: "code", status: "cited", citation: "SMC 23.44.050.B",
    summary: "The 2,500 sq ft floor area minimum applies to lots under 5,000 sq ft.",
    docs: { "21-dadu-lot-feasibility-math": ["under 5,000 sq ft"] },
  }),
  height: rule({
    label: "Height limit, principal unit and ADU", value: { base: 32, pitched: 5, shed: 3 }, unit: "ft", kind: "code", status: "cited", citation: "SMC 23.42.022.E; SMC 23.44.070",
    summary: "An ADU takes the principal unit's height limit: 32 ft, plus 5 ft for a pitched roof ridge (4:12 or steeper) or 3 ft for a shed or butterfly roof.",
    docs: { "21-dadu-lot-feasibility-math": ["32 ft"], "20-adu-rules-smc-23-42-022": ["32 feet"] },
  }),
  rearSetbackFt: rule({
    label: "ADU rear setback", value: 5, unit: "ft", kind: "code", status: "cited", citation: "SMC 23.44.090 Table A",
    summary: "A DADU sits at least 5 ft from the rear lot line, or 0 ft where the rear lot line abuts an alley.",
    docs: { "20-adu-rules-smc-23-42-022": ["5 feet", "abuts an alley"] },
  }),
  sideSetbackFt: rule({
    label: "Side setback", value: { average: 5, minimum: 3 }, unit: "ft", kind: "code", status: "cited", citation: "SMC 23.44.090 Table A",
    summary: "Side setbacks average 5 ft with a 3 ft minimum; Pencil uses the 5 ft average.",
  }),
  frontSetbackFt: rule({
    label: "Front setback, one or two units", value: 15, unit: "ft", kind: "code", status: "cited", citation: "SMC 23.44.090 Table A",
    summary: "15 ft on a lot with one or two dwelling units (10 ft with three or more). A DADU may not sit in it.",
  }),
  separationFt: rule({
    label: "Gap between the house and a DADU", value: 5, unit: "ft", kind: "code", status: "unverified", citation: "SMC 23.44.100",
    summary: "Pencil keeps a DADU at least 5 ft from the house and other buildings; the section is not confirmed.",
  }),
} as const;

export const PENCIL = {
  minLotSqft: rule({
    label: "Smallest lot Pencil shows", value: 3800, unit: "sq ft", kind: "pencil", status: "cited",
    summary: "A hard screen: Pencil never shows or recommends a lot under 3,800 sq ft. It is Pencil's investment screen, not a city rule.",
    docs: { "31-lot-size-and-dimensions": ["3,800 sq ft"], "30-dadu-screening-rules": ["3,800 sq ft"], "35-assessment-workflow": ["3,800 sq ft"], "36-site-score": ["3,800 sq ft"] },
  }),
  minLotWidthFt: rule({
    label: "Lot width below which Pencil warns", value: 25, unit: "ft", kind: "pencil", status: "cited",
    summary: "A warning, not a rule: lots narrower than 25 ft rarely fit a DADU and a path to it. Carried over from the repealed SMC 23.44.041 table.",
  }),
  minLotDepthFt: rule({
    label: "Lot depth below which Pencil warns", value: 70, unit: "ft", kind: "pencil", status: "cited",
    summary: "A warning, not a rule: lots shallower than 70 ft rarely leave room behind the house. Carried over from the repealed SMC 23.44.041 table.",
  }),
  noHoa: rule({
    label: "HOA", value: 0, unit: "$ per month", kind: "pencil", status: "cited",
    summary: "A property with any HOA fee is never a DADU candidate.",
    docs: { "30-dadu-screening-rules": ["HOA"] },
  }),
  buyBoxZones: rule({
    label: "Zones Pencil shows", value: ["NR", "NR2", "NR3"] as readonly string[], kind: "pencil", status: "cited",
    summary: "Neighborhood Residential lots zoned NR, NR2 or NR3; NR1 is out.",
  }),
  buyBoxMaxCoveragePct: rule({
    label: "Most of the lot already built on", value: 25, unit: "percent", kind: "pencil", status: "cited",
    summary: "Pencil shows lots with under 25 percent of the lot built on, so a DADU has room.",
  }),
  minShownScore: rule({
    label: "Lowest DADU site score Pencil shows", value: 65, unit: "points", kind: "pencil", status: "cited",
    summary: "Lots scoring under 65 out of 100 are not shown.",
  }),
  minFootprint: rule({
    label: "Smallest DADU footprint", value: { sqft: 300, sideFt: 15 }, unit: "sq ft", kind: "pencil", status: "cited",
    summary: "A DADU needs an open spot of at least 15 by 20 ft (300 sq ft) inside the setbacks, out of the front yard and 5 ft from the house.",
  }),
  drivewayFt: rule({
    label: "Driveway width to the rear", value: 10, unit: "ft", kind: "pencil", status: "cited",
    summary: "Vehicle access to a rear DADU without an alley or corner needs a 10 ft side clearance; under 8 ft is blocked.",
    docs: { "32-access-and-driveways": ["10"] },
  }),
  storyHeightFt: rule({
    label: "Floor-to-floor height used for stories", value: 10, unit: "ft", kind: "pencil", status: "cited",
    summary: "Pencil turns a height limit into stories at 10 ft each: 32 ft allows three.",
  }),
} as const;

export const RULEBOOK = { ADU, NR, PENCIL } as const;

/** NR FAR for a lot and unit count (SMC 23.44.050 Table A). */
export function nrFarFor(lotSqft: number, units: number): number {
  const perUnit = lotSqft / Math.max(1, units);
  return (NR_FAR_TABLE.find((r) => perUnit > r.lotPerUnitAboveSqft) ?? NR_FAR_TABLE[NR_FAR_TABLE.length - 1]).far;
}

/** Whether Pencil may show this lot: its size is known and at least the hard screen. */
export const meetsLotScreen = (lotSqft: number | null | undefined): boolean => lotSqft != null && lotSqft >= PENCIL.minLotSqft.value;

/** The sentence every surface uses for a lot under the screen. */
export const LOT_SCREEN_NOTE = `Pencil only considers lots of ${PENCIL.minLotSqft.value.toLocaleString("en-US")} sq ft or more. This is Pencil's screen; Seattle has no minimum lot size for a DADU.`;
