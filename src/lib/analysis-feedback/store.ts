import type { AnalysisFeedbackRecord } from "./types";

const STORAGE_KEY = "howtodadu.analysisFeedback.v1";
const MAX_LOCAL = 500;

function safeParse(raw: string | null): AnalysisFeedbackRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x === "object" && "id" in x) as AnalysisFeedbackRecord[];
  } catch {
    return [];
  }
}

export function loadFeedbackRecords(): AnalysisFeedbackRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

export function saveFeedbackRecords(records: AnalysisFeedbackRecord[]): void {
  if (typeof window === "undefined") return;
  const trimmed = records.slice(-MAX_LOCAL);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** Latest feedback for this address + same logic fingerprint (same analysis). */
export function findFeedbackForAnalysis(
  address: string,
  logicFingerprint: string
): AnalysisFeedbackRecord | undefined {
  const a = address.trim().toLowerCase();
  const list = loadFeedbackRecords();
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    if (
      r.snapshot.address.trim().toLowerCase() === a &&
      r.snapshot.logicFingerprint === logicFingerprint
    ) {
      return r;
    }
  }
  return undefined;
}

export function appendFeedback(record: AnalysisFeedbackRecord): void {
  const prev = loadFeedbackRecords();
  const withoutDup = prev.filter(
    (r) =>
      !(
        r.snapshot.address.trim().toLowerCase() === record.snapshot.address.trim().toLowerCase() &&
        r.snapshot.logicFingerprint === record.snapshot.logicFingerprint
      )
  );
  saveFeedbackRecords([...withoutDup, record]);
}

export function exportFeedbackJson(): string {
  return JSON.stringify(loadFeedbackRecords(), null, 2);
}
