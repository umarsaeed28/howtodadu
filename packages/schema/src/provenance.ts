import { z } from "zod";

/** Every GIS-derived value carries the layer it came from and when it was pulled (non-negotiable 4). */
export const Provenance = z.object({
  source_layer: z.string(),
  pulled_at: z.iso.datetime(),
  layer_last_edit: z.iso.datetime().nullable(),
});
export type Provenance = z.infer<typeof Provenance>;

/** A number that came from PostGIS, the FAR engine, or config. Never from the LLM (non-negotiable 1). */
export const SourcedNumber = z.object({
  value: z.number(),
  unit: z.string(),
  origin: z.enum(["postgis", "far_engine", "config"]),
  provenance: Provenance.nullable(),
});
export type SourcedNumber = z.infer<typeof SourcedNumber>;

/** A code claim. No citation means status "unverified" (non-negotiable 2). */
export const Citation = z.object({
  section: z.string(), // e.g. "SMC 23.44.041.C.2" or "RCW 36.70A.635"
  effective_from: z.iso.date().nullable(),
  status: z.enum(["verified", "unverified"]),
  chunk_id: z.string().nullable(),
  quote: z.string().nullable(),
});
export type Citation = z.infer<typeof Citation>;
