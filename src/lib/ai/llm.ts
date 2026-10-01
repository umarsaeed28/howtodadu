import Anthropic from "@anthropic-ai/sdk";
import type { Llm, LlmJsonRequest } from "./types";

/** Cheap, fast model for query rewriting. Strong model for the analysis. */
export const FAST_MODEL = process.env.AI_FAST_MODEL ?? "claude-haiku-4-5-20251001";
export const REASONING_MODEL = process.env.AI_REASONING_MODEL ?? "claude-sonnet-5-5";

export class AnthropicLlm implements Llm {
  private client: Anthropic;
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /** Structured output: the model must call one tool whose input is the schema. No free-text parsing. */
  async json<T>(req: LlmJsonRequest): Promise<T> {
    const msg = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      tools: [{ name: req.toolName, description: "Return the result.", input_schema: req.schema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: req.toolName },
      messages: [{ role: "user", content: req.user }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("The model returned no structured result.");
    return block.input as T;
  }

  async text(req: { model: string; system: string; user: string; maxTokens: number }): Promise<string> {
    const msg = await this.client.messages.create({ model: req.model, max_tokens: req.maxTokens, system: req.system, messages: [{ role: "user", content: req.user }] });
    return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  }
}
