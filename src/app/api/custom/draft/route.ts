import { llmFor } from "@/lib/ai/llm";
import { AGENTS } from "@/lib/ai/agents.config";
import { RunMeter, dailyBudget } from "@/lib/ai/usage";
import { draftLayout, parseFootprint } from "@/lib/custom/draft";
import { supabaseAdmin } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const PER_DAY = 20;
/** One draft per footprint per server instance: the same 20 x 25 two-story gets the same answer, free. */
const cache = new Map<string, unknown>();

/** At most PER_DAY drafts a day from one IP, counted in rate_limits. Allows when the table is not there. */
async function allowed(ip: string): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return true;
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const key = `draft:${ip}`;
  const { data, error } = await db.from("rate_limits").select("count").eq("key", key).eq("window_start", day.toISOString()).maybeSingle();
  if (error) return true;
  if ((data?.count ?? 0) >= PER_DAY) return false;
  await db.from("rate_limits").upsert({ key, window_start: day.toISOString(), count: (data?.count ?? 0) + 1 });
  return true;
}

/**
 * POST /api/custom/draft { w, d, stories } → { blocks, source: "ai" | "rules", notes }.
 * Claude (the draft tier, metered against the daily token budget) proposes room blocks; code validates them; the
 * rule-based layout covers any failure. The visitor sees "Draft layout. Our architects finalize every plan."
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const f = parseFootprint(body);
  if (!f) return Response.json({ error: "Footprints are 10 to 50 ft a side and up to 1,200 sf in all." }, { status: 422 });
  const key = `${f.w}x${f.d}x${f.stories}`;
  if (cache.has(key)) return Response.json(cache.get(key));

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const withinBudget = AGENTS.budget.dailyMaxTokens - (await dailyBudget.used().catch(() => 0)) > 0;
  const useAi = withinBudget && (await allowed(ip));
  const meter = new RunMeter(AGENTS.budget.perRunMaxTokens);
  const llm = useAi ? llmFor("draft", process.env.ANTHROPIC_API_KEY, (u) => meter.add(u)) : null;
  const draft = await draftLayout(f, llm);
  if (meter.total) await dailyBudget.add(meter.total).catch(() => {});
  if (draft.source === "ai") cache.set(key, draft);
  return Response.json(draft);
}
