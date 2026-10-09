import { describe, expect, it } from "vitest";
import type { Llm } from "@/lib/ai/types";
import { draftLayout, parseFootprint } from "./draft";
import { ruleLayout, validateLayout } from "./layout";

const f = { w: 20, d: 25, stories: 2 as const };
const stub = (answers: (unknown | Error)[]): { llm: Llm; model: string; calls: string[] } => {
  const calls: string[] = [];
  const llm: Llm = {
    async json<T>(req: { user: string }) {
      calls.push(req.user);
      const next = answers.shift();
      if (next instanceof Error) throw next;
      return next as T;
    },
    async text() {
      return "";
    },
  };
  return { llm, model: "claude-opus-5-5", calls };
};

describe("draftLayout", () => {
  it("returns Claude's layout when it passes the checks", async () => {
    const good = { blocks: ruleLayout(f) };
    const s = stub([good]);
    const d = await draftLayout(f, s);
    expect(d.source).toBe("ai");
    expect(validateLayout(d.blocks, f)).toEqual([]);
    expect(s.calls).toHaveLength(1);
  });

  it("retries once with the broken rules, then falls back to the rule layout", async () => {
    const bad = { blocks: [{ kind: "living", floor: 1, x: 0, y: 0, w: 30, h: 30, label: "L", egress: false }] };
    const s = stub([bad, bad]);
    const d = await draftLayout(f, s);
    expect(s.calls).toHaveLength(2);
    expect(s.calls[1]).toContain("broke these rules");
    expect(d.source).toBe("rules");
    expect(validateLayout(d.blocks, f)).toEqual([]);
  });

  it("falls back when the model call throws, and without a model at all", async () => {
    expect((await draftLayout(f, stub([new Error("overloaded")]))).source).toBe("rules");
    const none = await draftLayout(f, null);
    expect(none).toMatchObject({ source: "rules", notes: [] });
  });
});

describe("parseFootprint", () => {
  it("accepts sane footprints and refuses the rest", () => {
    expect(parseFootprint({ w: 20, d: 25, stories: 2 })).toEqual({ w: 20, d: 25, stories: 2 });
    expect(parseFootprint({ w: 24, d: 24 })).toEqual({ w: 24, d: 24, stories: 1 });
    expect(parseFootprint({ w: 8, d: 20 })).toBeNull();
    expect(parseFootprint({ w: 30, d: 30, stories: 2 })).toBeNull();
    expect(parseFootprint("nope")).toBeNull();
  });
});
