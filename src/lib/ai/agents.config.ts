/**
 * One place to tune the assessment agents and keep token use low.
 *
 * Principles, in order:
 *  1. Code before models. Gates, facts, retrieval, validation and the score baseline never call a model.
 *  2. Cache by the facts. An unchanged listing is never re-run inside `cache.ttlHours`.
 *  3. Smallest model that can do the job. A free open model (or Haiku) for extraction and query rewriting,
 *     Haiku for the normal read, the large model only when the case is close or ambiguous.
 *  4. Hard caps. Every call has a max token limit; each run and each day has a budget, and over budget the app
 *     falls back to the rules-only score, labelled as such.
 *
 * Override any model per environment with the env vars named in `tiers`.
 */

export type Tier = "small" | "mid" | "large";

export interface TierConfig {
  /** "openai-compatible" covers Ollama, vLLM, Groq, Cloudflare Workers AI and other hosts of open models. */
  provider: "anthropic" | "openai-compatible";
  model: string;
  /** Used when the provider is not configured or the call fails. */
  fallback?: { provider: "anthropic"; model: string };
}

export interface NodeConfig {
  kind: "code" | "llm";
  tier?: Tier;
  maxTokens?: number;
  temperature?: number;
  /** For "llm" nodes that may be skipped: what happens when the model call fails. */
  onFail?: "skip" | "fallback" | "throw";
}

const env = (k: string, d: string) => (typeof process !== "undefined" && process.env[k]) || d;
const HAIKU = "claude-haiku-4-5-20251001";

export const AGENTS = {
  budget: {
    /** Upper bound on input + output tokens for one assessment, across all nodes. */
    perRunMaxTokens: Number(env("AI_RUN_TOKEN_BUDGET", "5000")),
    /** Upper bound per UTC day across all assessments. Over it, runs return the rules-only score. */
    dailyMaxTokens: Number(env("AI_DAILY_TOKEN_BUDGET", "1500000")),
  },
  cache: {
    /** Results are keyed by a hash of the facts, so any change to the listing or lot re-runs it. */
    ttlHours: Number(env("AI_CACHE_TTL_HOURS", "168")),
  },
  /** Anthropic prompt caching for the fixed system prompts. */
  promptCache: true,
  retrieve: { k: 6, extraQueryK: 3, maxPassages: 10, maxCharsPerPassage: 700 },
  nodes: {
    gate: { kind: "code" },
    facts: { kind: "code" },
    /** Pull access and unit features out of the listing text. Every feature must quote the text verbatim (checked). */
    extract: { kind: "llm", tier: "small", maxTokens: 220, temperature: 0, onFail: "skip" },
    /** Hypothetical passage to improve retrieval. Only affects search, so the cheapest model is fine. */
    hyde: { kind: "llm", tier: "small", maxTokens: 120, temperature: 0, onFail: "skip" },
    retrieve: { kind: "code" },
    analyze: { kind: "llm", tier: "mid", maxTokens: 800, temperature: 0, onFail: "throw" },
    validate: { kind: "code" },
    decide: { kind: "code" },
    /** Eval-only rubric judge. */
    judge: { kind: "llm", tier: "small", maxTokens: 150, temperature: 0, onFail: "fallback" },
  } satisfies Record<string, NodeConfig>,
  /** When the analysis moves up from the mid to the large model. */
  escalate: {
    to: "large" as Tier,
    /** Baseline within this many points of a grade boundary (70, 82, 93). */
    nearBoundaryPts: 3,
    /** The listing text mentions access or unit features the city data cannot see. */
    onExtractedSignals: true,
    /** The sources disagree (e.g. listing lot size vs city lot size). */
    onConflicts: true,
  },
  tiers: {
    small: {
      provider: env("OSS_LLM_BASE_URL", "") ? "openai-compatible" : "anthropic",
      model: env("OSS_LLM_BASE_URL", "") ? env("OSS_SMALL_MODEL", "qwen2.5:7b-instruct") : env("AI_FAST_MODEL", HAIKU),
      fallback: { provider: "anthropic", model: env("AI_FAST_MODEL", HAIKU) },
    },
    mid: { provider: "anthropic", model: env("AI_MID_MODEL", HAIKU) },
    large: { provider: "anthropic", model: env("AI_REASONING_MODEL", "claude-sonnet-5-5") },
  } satisfies Record<Tier, TierConfig>,
} as const;

export type AgentsConfig = typeof AGENTS;
