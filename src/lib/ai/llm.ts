import Anthropic from "@anthropic-ai/sdk";
import type { Llm, LlmJsonRequest } from "./types";
import { AGENTS, type Tier, type TierConfig } from "./agents.config";
import type { Usage } from "./usage";

/** Kept for callers that name a model directly (evals). The orchestrator routes by tier instead. */
export const FAST_MODEL = AGENTS.tiers.small.fallback?.model ?? "claude-haiku-4-5-20251001";
export const REASONING_MODEL = AGENTS.tiers.large.model;

type OnUsage = (u: Usage) => void;

/** A JSON schema reduced to what structured outputs accept: closed objects, no numeric or length limits. */
function strictSchema(schema: unknown): Record<string, unknown> {
  const walk = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(walk);
    if (!n || typeof n !== "object") return n;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
      if (["minimum", "maximum", "maxItems", "minLength", "maxLength", "exclusiveMinimum", "exclusiveMaximum"].includes(k)) continue;
      if (k === "minItems" && typeof v === "number" && v > 1) continue;
      out[k] = walk(v);
    }
    if (out.type === "object") {
      out.additionalProperties = false;
      // These models think internally; asking them to write their reasoning out trips the reasoning-extraction safeguard.
      if (out.properties && typeof out.properties === "object" && "reasoning" in (out.properties as object)) {
        const { reasoning: _drop, ...rest } = out.properties as Record<string, unknown>;
        void _drop;
        out.properties = rest;
        if (Array.isArray(out.required)) out.required = (out.required as string[]).filter((r) => r !== "reasoning");
      }
    }
    return out;
  };
  return walk(schema) as Record<string, unknown>;
}

/** Models where thinking is always on, sampling parameters are fixed, and forced tool_choice is rejected. */
export const isThinkingAlwaysOn = (model: string) => /claude-(sonnet-5-5|opus-5-5|fable-5-1|mythos-5-1)/.test(model);

export class AnthropicLlm implements Llm {
  private client: Anthropic;
  constructor(apiKey: string, private onUsage?: OnUsage) {
    this.client = new Anthropic({ apiKey });
  }

  /** The system prompt is marked for prompt caching: repeated runs pay for it once per cache window. */
  private system(text: string): Anthropic.TextBlockParam[] {
    return [{ type: "text", text, ...(AGENTS.promptCache ? { cache_control: { type: "ephemeral" as const } } : {}) }];
  }

  private record(model: string, u: Anthropic.Usage | undefined) {
    if (!u || !this.onUsage) return;
    this.onUsage({ model, input: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0 });
  }

  /** Structured output with no free-text parsing: forced tool use, or JSON-schema output on models that reject forcing. */
  async json<T>(req: LlmJsonRequest): Promise<T> {
    if (isThinkingAlwaysOn(req.model)) {
      // Sonnet 5.5 / Opus 5.5 / Fable 5.1: no forced tool_choice and no custom temperature, so use structured outputs.
      // The schema is reduced to what structured outputs accept; the validate step still enforces the dropped limits.
      const msg = await this.client.messages.create({
        model: req.model,
        max_tokens: req.maxTokens + 3000, // room for the model's own (low-effort) thinking
        output_config: { effort: "low", format: { type: "json_schema", schema: strictSchema(req.schema) } },
        system: this.system(req.system),
        messages: [{ role: "user", content: req.user }],
      });
      this.record(req.model, msg.usage);
      if (msg.stop_reason === "max_tokens") throw new Error("The model's answer was cut off at the token limit.");
      if (msg.stop_reason === "refusal") throw new Error(`The model declined this request (${msg.stop_details?.category ?? "no category"}).`);
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      if (!text.trim()) throw new Error(`The model returned no structured result (stop: ${msg.stop_reason}).`);
      return JSON.parse(text) as T;
    }
    const msg = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0,
      system: this.system(req.system),
      tools: [{ name: req.toolName, description: "Return the result.", input_schema: req.schema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: req.toolName },
      messages: [{ role: "user", content: req.user }],
    });
    this.record(req.model, msg.usage);
    // A cut-off tool call still parses, with its later fields missing, so treat it as a failure rather than an answer.
    if (msg.stop_reason === "max_tokens") throw new Error("The model's answer was cut off at the token limit.");
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("The model returned no structured result.");
    return block.input as T;
  }

  async text(req: { model: string; system: string; user: string; maxTokens: number; temperature?: number }): Promise<string> {
    const modern = isThinkingAlwaysOn(req.model);
    const msg = await this.client.messages.create({
      model: req.model,
      max_tokens: modern ? req.maxTokens + 3000 : req.maxTokens,
      ...(modern ? { output_config: { effort: "low" as const } } : { temperature: req.temperature ?? 0 }),
      system: this.system(req.system),
      messages: [{ role: "user", content: req.user }],
    });
    this.record(req.model, msg.usage);
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  }
}

/**
 * Any OpenAI-compatible chat endpoint: Ollama (http://localhost:11434/v1), vLLM, Groq, Cloudflare Workers AI,
 * Hugging Face Inference. Used for the small, checked jobs (extraction, query rewriting, eval judging).
 */
export class OpenAiCompatibleLlm implements Llm {
  constructor(private baseUrl: string, private apiKey: string | undefined, private onUsage?: OnUsage) {}

  private async chat(model: string, system: string, user: string, maxTokens: number, temperature: number, json: boolean): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Open model host returned ${res.status}`);
    const d = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    this.onUsage?.({ model, input: d.usage?.prompt_tokens ?? 0, output: d.usage?.completion_tokens ?? 0, cacheRead: 0 });
    return (d.choices?.[0]?.message?.content ?? "").trim();
  }

  async json<T>(req: LlmJsonRequest): Promise<T> {
    const system = `${req.system}\n\nReply with one JSON object only, matching this JSON schema:\n${JSON.stringify(req.schema)}`;
    const out = await this.chat(req.model, system, req.user, req.maxTokens, req.temperature ?? 0, true);
    const start = out.indexOf("{"), end = out.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("The open model returned no JSON.");
    return JSON.parse(out.slice(start, end + 1)) as T;
  }

  async text(req: { model: string; system: string; user: string; maxTokens: number; temperature?: number }): Promise<string> {
    return this.chat(req.model, req.system, req.user, req.maxTokens, req.temperature ?? 0, false);
  }
}

/** A model bound to a tier: callers pass `model` through, the router fills it in and falls back on failure. */
export interface TierLlm {
  llm: Llm;
  model: string;
}

function build(cfg: Pick<TierConfig, "provider" | "model">, anthropicKey: string | undefined, onUsage?: OnUsage): TierLlm | null {
  if (cfg.provider === "openai-compatible") {
    const base = process.env.OSS_LLM_BASE_URL;
    return base ? { llm: new OpenAiCompatibleLlm(base, process.env.OSS_LLM_API_KEY, onUsage), model: cfg.model } : null;
  }
  return anthropicKey ? { llm: new AnthropicLlm(anthropicKey, onUsage), model: cfg.model } : null;
}

/** Wraps a primary model with a fallback: if the primary throws, the same request goes to the fallback model. */
class FallbackLlm implements Llm {
  constructor(private primary: TierLlm, private backup: TierLlm) {}
  async json<T>(req: LlmJsonRequest): Promise<T> {
    try {
      return await this.primary.llm.json<T>({ ...req, model: this.primary.model });
    } catch {
      return this.backup.llm.json<T>({ ...req, model: this.backup.model });
    }
  }
  async text(req: { model: string; system: string; user: string; maxTokens: number; temperature?: number }): Promise<string> {
    try {
      return await this.primary.llm.text({ ...req, model: this.primary.model });
    } catch {
      return this.backup.llm.text({ ...req, model: this.backup.model });
    }
  }
}

/** The model for a tier, per `AGENTS.tiers`, with its fallback. Null when nothing for that tier is configured. */
export function llmFor(tier: Tier, anthropicKey: string | undefined, onUsage?: OnUsage): TierLlm | null {
  const cfg: TierConfig = AGENTS.tiers[tier];
  const primary = build(cfg, anthropicKey, onUsage);
  const backup = cfg.fallback ? build(cfg.fallback, anthropicKey, onUsage) : null;
  if (primary && backup && (primary.model !== backup.model || cfg.provider !== cfg.fallback?.provider)) return { llm: new FallbackLlm(primary, backup), model: primary.model };
  return primary ?? backup;
}
