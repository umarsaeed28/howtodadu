"""API contract with the Next.js app. JSON is camelCase to match src/lib/ai/types.ts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---- request -----------------------------------------------------------------------------------------


class Fact(Camel):
    """A deterministic fact the model can cite, labelled F1, F2..."""

    label: str
    text: str
    source: str


class Gate(Camel):
    key: str
    label: str
    status: Literal["pass", "fail", "unknown"]
    note: str


class Factor(Camel):
    key: str
    name: str
    weight: float
    score: float
    note: str


class GradeBand(Camel):
    tier: int
    label: str
    min: float


class SiteScore(Camel):
    """The rules baseline, computed by the website (src/lib/dadu-score.ts), the single source of truth for scoring."""

    eligible: bool
    score: float
    tier: int
    grade: str
    gates: list[Gate]
    factors: list[Factor]


class ListingIn(Camel):
    mls_id: str
    address: str
    hoa_monthly: float | None = None
    lot_sqft: float = 0
    description: str = ""


class LotIn(Camel):
    lot_sqft: float
    lot_type: str | None = None


class AssessRequest(Camel):
    listing: ListingIn
    lot: LotIn | None = None
    facts: list[Fact]
    site: SiteScore | None = None
    grade_bands: list[GradeBand] = Field(default_factory=list)


# ---- model I/O ---------------------------------------------------------------------------------------


class Finding(Camel):
    claim: str
    cites: list[str]


class Adjustment(Camel):
    factor: str
    delta: float
    reason: str
    cites: list[str]


Verdict = Literal["candidate", "not_candidate", "unverified"]


class Analysis(Camel):
    """What the analysis model must return (forced tool call)."""

    reasoning: str = Field(description="Step-by-step reasoning. Not shown to the user.")
    verdict: Verdict
    headline: str
    findings: list[Finding] = Field(default_factory=list, max_length=5)
    confirm: list[str] = Field(default_factory=list, max_length=4)
    adjustments: list[Adjustment] = Field(default_factory=list, max_length=4)


ExtractFeature = Literal["side_driveway", "garage", "alley_access", "separate_entry", "existing_adu", "lower_unit", "other"]


class Extracted(Camel):
    feature: ExtractFeature
    quote: str


class ExtractResult(Camel):
    features: list[Extracted] = Field(default_factory=list, max_length=5)


class Passage(Camel):
    label: str
    id: str
    doc_id: str
    section: str
    text: str
    distance: float


# ---- response ----------------------------------------------------------------------------------------


class TraceStep(Camel):
    node: str
    kind: Literal["deterministic", "llm"]
    ms: int
    ok: bool
    note: str


class Citation(Camel):
    label: str
    doc_id: str
    section: str


class Rejected(Camel):
    factor: str
    delta: float
    reason: str


class ScoreDecision(Camel):
    baseline_score: float
    score: float
    tier: int
    grade: str
    adjustments: list[Adjustment]
    rejected: list[Rejected]
    decided_by: Literal["ai", "rules"]


class Assessment(Camel):
    verdict: Literal["excluded", "candidate", "not_candidate", "unverified"]
    headline: str
    findings: list[Finding] = Field(default_factory=list)
    confirm: list[str] = Field(default_factory=list)
    unavailable: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    text: str = ""
    models: list[str] = Field(default_factory=list)
    trace: list[TraceStep] = Field(default_factory=list)
    score: ScoreDecision | None = None
    tokens: int = 0
    cached: bool = False


class FeedbackIn(Camel):
    subject: str = Field(min_length=1, max_length=120, description="Lot PIN or listing MLS id")
    rating: Literal["up", "down"]
    comment: str = Field(default="", max_length=1000)
    snapshot: dict[str, object] = Field(default_factory=dict)


class SearchIn(Camel):
    question: str = Field(min_length=2, max_length=2000)
    k: int = Field(default=6, ge=1, le=20)
    hyde: str = ""
    scope: Literal["rules", "test", "all"] = "rules"
