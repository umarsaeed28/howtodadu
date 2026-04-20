import { describe, it, expect, beforeEach, vi } from "vitest";
import { computeLogicFingerprint } from "@/lib/analysis-feedback/snapshot";
import { appendFeedback, findFeedbackForAnalysis, loadFeedbackRecords } from "@/lib/analysis-feedback/store";
import type { AnalysisFeedbackRecord } from "@/lib/analysis-feedback/types";

describe("computeLogicFingerprint", () => {
  it("is stable for identical inputs", () => {
    const a = computeLogicFingerprint({
      rulesetVersion: "1",
      daduScore: 74,
      zoning: "NR2",
      availableCoverageSqft: 800,
      reportConfidence: 83,
      verdict: "strong",
      confidenceBand: "medium",
    });
    const b = computeLogicFingerprint({
      rulesetVersion: "1",
      daduScore: 74,
      zoning: "NR2",
      availableCoverageSqft: 800,
      reportConfidence: 83,
      verdict: "strong",
      confidenceBand: "medium",
    });
    expect(a).toBe(b);
  });

  it("changes when score changes", () => {
    const a = computeLogicFingerprint({
      rulesetVersion: "1",
      daduScore: 74,
      zoning: "NR2",
      availableCoverageSqft: 800,
      reportConfidence: 83,
      verdict: "strong",
      confidenceBand: "medium",
    });
    const b = computeLogicFingerprint({
      rulesetVersion: "1",
      daduScore: 75,
      zoning: "NR2",
      availableCoverageSqft: 800,
      reportConfidence: 83,
      verdict: "strong",
      confidenceBand: "medium",
    });
    expect(a).not.toBe(b);
  });
});

describe("feedback store", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    const ls = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as Storage;
    vi.stubGlobal("window", { localStorage: ls } as Window);
    vi.stubGlobal("localStorage", ls);
  });

  it("dedupes by address + logic fingerprint", () => {
    const snap = {
      schema: 1 as const,
      rulesetVersion: "t",
      logicFingerprint: "fp1",
      address: "1 Main St",
      parcelId: null,
      daduScore: 70,
      verdict: "medium" as const,
      verdictLabel: "Moderate potential",
      reportConfidence: 80,
      confidenceLabel: "Moderate Feasibility",
      confidenceBand: "medium" as const,
      zoning: "NR2",
      availableCoverageSqft: 900,
      lotSizeSqft: 5000,
      headline: "x",
    };
    const r1: AnalysisFeedbackRecord = {
      id: "a",
      createdAtIso: new Date().toISOString(),
      rating: "up",
      negativeReason: null,
      snapshot: snap,
      appVersion: "test",
    };
    appendFeedback(r1);
    expect(loadFeedbackRecords()).toHaveLength(1);

    const r2: AnalysisFeedbackRecord = {
      ...r1,
      id: "b",
      rating: "down",
      negativeReason: "too high",
    };
    appendFeedback(r2);
    expect(loadFeedbackRecords()).toHaveLength(1);
    expect(findFeedbackForAnalysis("1 Main St", "fp1")?.rating).toBe("down");
  });
});
