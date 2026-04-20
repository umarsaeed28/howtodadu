import type { AnalysisFeedbackRecord } from "./types";

/**
 * Persists to server `data/feedback/entries.jsonl` when API is available.
 * Fails silently in offline / static export contexts.
 */
export async function mirrorFeedbackToServer(record: AnalysisFeedbackRecord): Promise<void> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      console.warn("[feedback] server mirror failed", res.status);
    }
  } catch {
    // offline or no API
  }
}
