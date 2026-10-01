export interface Passage {
  /** Label the model cites, "P1", "P2"… */
  label: string;
  /** Stable chunk id from the vector store. */
  id: string;
  /** Document ID: the knowledge-base file. */
  docId: string;
  /** Section path inside the document. */
  section: string;
  text: string;
  distance: number;
}

/** A labelled fact from deterministic sources (listing feed, city GIS). Cited as "F1", "F2"… */
export interface Fact {
  label: string;
  text: string;
  source: string;
}

export interface Finding {
  claim: string;
  /** Labels of the passages and facts that support the claim. */
  cites: string[];
}

export type Verdict = "candidate" | "not_candidate" | "unverified";

/** A change Claude makes to one factor of the rules baseline, with the sources that justify it. */
export interface Adjustment {
  /** Factor name, as in the baseline facts (e.g. "Vehicle access"). */
  factor: string;
  /** Points added to or taken from the total score, -15 to +15. */
  delta: number;
  reason: string;
  cites: string[];
}

export interface Analysis {
  reasoning: string;
  verdict: Verdict;
  headline: string;
  findings: Finding[];
  confirm: string[];
  adjustments?: Adjustment[];
}

/** The score as decided. "ai" when Claude reviewed the baseline (with or without changes); "rules" when no model ran. */
export interface ScoreDecision {
  baselineScore: number;
  score: number;
  tier: 0 | 1 | 2 | 3;
  grade: string;
  adjustments: Adjustment[];
  /** Adjustments the validator refused, with the reason. */
  rejected: { factor: string; delta: number; reason: string }[];
  decidedBy: "ai" | "rules";
}

export interface TraceStep {
  node: string;
  kind: "deterministic" | "llm";
  ms: number;
  ok: boolean;
  note: string;
}

export interface Citation {
  label: string;
  docId: string;
  section: string;
}

export interface Assessment {
  verdict: "excluded" | "candidate" | "not_candidate" | "unverified";
  headline: string;
  findings: Finding[];
  confirm: string[];
  /** Statements the retrieved sources could not support. */
  unavailable: string[];
  citations: Citation[];
  /** Plain-text version, for API consumers. */
  text: string;
  models: string[];
  trace: TraceStep[];
  /** Null when the listing has no lot in the library or failed a gate. */
  score: ScoreDecision | null;
  cached?: boolean;
}

export interface LlmJsonRequest {
  model: string;
  system: string;
  user: string;
  toolName: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}

/** The only door to a model. Tests pass a stub; production passes the Anthropic client. */
export interface Llm {
  json<T>(req: LlmJsonRequest): Promise<T>;
  text(req: { model: string; system: string; user: string; maxTokens: number }): Promise<string>;
}
