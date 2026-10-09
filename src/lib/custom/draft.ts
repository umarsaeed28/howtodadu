import type { Llm } from "@/lib/ai/types";
import { DRAFT_SCHEMA, DRAFT_SYSTEM, ruleLayout, validateLayout, type Block, type Footprint } from "./layout";

export type Draft = { blocks: Block[]; source: "ai" | "rules"; notes: string[] };

const prompt = (f: Footprint, fix?: string[]) =>
  `Footprint: W = ${f.w} ft, D = ${f.d} ft, ${f.stories} ${f.stories === 1 ? "story" : "stories"}.${f.stories === 2 ? " Use floors 1 and 2." : " Use floor 1 only."}` +
  (fix?.length ? `\n\nYour last layout broke these rules. Fix every one:\n- ${fix.join("\n- ")}` : "");

const round = (n: number) => Math.round(n * 2) / 2;

/** Snaps Claude's numbers to half feet and drops anything that is not a block, so validation judges the plan, not noise. */
function clean(raw: unknown): Block[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { blocks?: unknown }).blocks) ? (raw as { blocks: unknown[] }).blocks : [];
  return list
    .filter((b): b is Block => !!b && typeof b === "object")
    .map((b) => ({ kind: b.kind, floor: b.floor === 2 ? 2 : 1, x: round(+b.x), y: round(+b.y), w: round(+b.w), h: round(+b.h), label: typeof b.label === "string" ? b.label.slice(0, 24) : undefined, egress: !!b.egress }));
}

/**
 * Claude drafts the room blocks; code checks them. One retry with the broken rules spelled out, then the
 * rule-based layout, so a visitor always gets a draft that passes. `llm` is null when no API key is set.
 */
export async function draftLayout(f: Footprint, llm: { llm: Llm; model: string } | null): Promise<Draft> {
  if (llm) {
    let errors: string[] | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await llm.llm.json<unknown>({ model: llm.model, system: DRAFT_SYSTEM, user: prompt(f, errors), toolName: "dadu_layout", schema: DRAFT_SCHEMA as unknown as Record<string, unknown>, maxTokens: 4000 });
        const blocks = clean(out);
        errors = validateLayout(blocks, f);
        if (!errors.length) return { blocks, source: "ai", notes: [] };
      } catch {
        break;
      }
    }
    return { blocks: ruleLayout(f), source: "rules", notes: ["The AI draft did not pass our checks, so this is our standard layout for your footprint."] };
  }
  return { blocks: ruleLayout(f), source: "rules", notes: [] };
}

/** A footprint the draft accepts: 10 to 50 ft a side, one or two stories, at most 1,200 sf of floor area in all. */
export function parseFootprint(v: unknown): Footprint | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { w?: unknown; d?: unknown; stories?: unknown };
  const w = Math.round(Number(o.w)), d = Math.round(Number(o.d));
  const stories = o.stories === 2 ? 2 : 1;
  if (!Number.isFinite(w) || !Number.isFinite(d) || w < 10 || d < 10 || w > 50 || d > 50) return null;
  if (w * d * stories > 1200) return null;
  return { w, d, stories };
}
