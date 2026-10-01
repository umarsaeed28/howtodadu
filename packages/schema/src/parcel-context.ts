import { z } from "zod";
import { Provenance } from "./provenance";

const Pv = Provenance;

export const EcaType = z.enum([
  "steep_slope",
  "known_slide",
  "potential_slide",
  "riparian",
  "wetland",
  "liquefaction",
  "peat_settlement",
  "flood",
  "landfill",
  "fish_wildlife",
]);

export const ParcelContext = z.object({
  pin: z.string(),
  address: z.string(),
  zone: z.string(),
  lot_area_sf: z.number(),
  mbr_width_ft: z.number(),
  mbr_length_ft: z.number(),
  bound_ratio: z.number(),
  lot_type: z.enum(["corner", "interior", "landlocked"]),
  street_edge_count: z.number().int(),
  has_alley: z.boolean(),
  alley_edge_length_ft: z.number().nullable(),
  eca: z.array(z.object({ type: EcaType, overlap_pct: z.number(), area_sf: z.number() })),
  rear_slope: z.object({ avg_pct: z.number(), max_pct: z.number() }).nullable(),
  side_clearances_ft: z.object({ left: z.number().nullable(), right: z.number().nullable() }),
  transit: z.object({ hb1110_half_mile: z.boolean(), frequent_transit_area: z.boolean() }),
  utility_flags: z.object({
    side_sewer_crosses_neighbor: z.boolean().nullable(),
    low_fire_flow: z.boolean(),
    retaining_walls: z.boolean(),
  }),
  nearby_adus: z.object({ dadu: z.number().int(), aadu: z.number().int() }),
  hose_pull_distance_ft: z.number().nullable(),
  basement_sf: z.number().nullable(),
  year_built: z.number().int().nullable(),
  provenance: z.record(z.string(), Pv), // field name -> source layer + pull date
});
export type ParcelContext = z.infer<typeof ParcelContext>;
