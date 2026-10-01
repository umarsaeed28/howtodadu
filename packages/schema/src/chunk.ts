import { z } from "zod";

export const SourceType = z.enum([
  "smc",
  "rcw",
  "commerce",
  "ordinance",
  "sdci_tip",
  "directors_rule",
  "opcd",
  "aduniverse",
]);
export type SourceType = z.infer<typeof SourceType>;

/** One chunk per code subsection, parent path header prepended. Never chunked by token count. */
export const Chunk = z.object({
  id: z.string().optional(),
  section: z.string(),
  parent_path: z.string(), // "SMC 23.44.041 > C > 2"
  source_type: SourceType,
  ordinance: z.string().nullable(),
  effective_from: z.iso.date(),
  effective_to: z.iso.date().nullable(),
  zones: z.array(z.string()),
  content: z.string(),
  embedding: z.array(z.number()).length(1024).optional(),
});
export type Chunk = z.infer<typeof Chunk>;

export const MatchChunksArgs = z.object({
  query_text: z.string(),
  query_embedding: z.array(z.number()).length(1024),
  zone: z.string().nullable(),
  as_of_date: z.iso.date(),
  match_count: z.number().int().default(30),
});
export type MatchChunksArgs = z.infer<typeof MatchChunksArgs>;
