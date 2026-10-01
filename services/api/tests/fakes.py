"""Fakes for tests: models that return canned results and record calls; a store with fixed passages."""

from __future__ import annotations

from typing import Any, TypeVar

from pydantic import BaseModel

from app.budget import Usage
from app.schemas import (
    Analysis,
    AssessRequest,
    Fact,
    Factor,
    Gate,
    GradeBand,
    ListingIn,
    LotIn,
    Passage,
    SiteScore,
)

T = TypeVar("T", bound=BaseModel)


class FakeModel:
    def __init__(
        self, name: str, analysis: Analysis | None = None, extract: dict[str, Any] | None = None, fail: bool = False
    ) -> None:
        self.name = name
        self.analysis = analysis
        self.extract = extract or {"features": []}
        self.fail = fail
        self.calls: list[str] = []

    def structured(self, schema: type[T], system: str, user: str, max_tokens: int, config: Any = None) -> tuple[T, Usage]:
        self.calls.append(f"structured:{schema.__name__}")
        if self.fail:
            raise RuntimeError("model down")
        if schema is Analysis:
            assert self.analysis is not None
            return schema.model_validate(self.analysis.model_dump()), Usage(self.name, 900, 300)
        return schema.model_validate(self.extract), Usage(self.name, 200, 50)

    def text(self, system: str, user: str, max_tokens: int, config: Any = None) -> tuple[str, Usage]:
        self.calls.append("text")
        if self.fail:
            raise RuntimeError("model down")
        return "A property with no homeowners association can be a DADU candidate under the screening rules.", Usage(
            self.name, 150, 40
        )


class FakeStore:
    def __init__(self, passages: list[Passage] | None = None) -> None:
        self.passages = (
            passages
            if passages is not None
            else [
                Passage(
                    label="P1",
                    id="c1",
                    doc_id="30-dadu-screening-rules",
                    section="No HOA",
                    text="A property with an HOA is never a DADU candidate.",
                    distance=0.2,
                )
            ]
        )
        self.queries: list[str] = []

    def search(self, question: str, k: int = 6, hyde: str = "", scope: str = "rules") -> list[Passage]:
        self.queries.append(question)
        return list(self.passages)


BANDS = [
    GradeBand(tier=3, label="Top pick", min=93),
    GradeBand(tier=2, label="Good", min=82),
    GradeBand(tier=1, label="Fair", min=70),
    GradeBand(tier=0, label="Marginal", min=0),
]


def site(score: float = 75, gates_fail: bool = False) -> SiteScore:
    return SiteScore(
        eligible=not gates_fail,
        score=0 if gates_fail else score,
        tier=1,
        grade="Fair",
        gates=[
            Gate(
                key="access",
                label="Vehicle access",
                status="fail" if gates_fail else "pass",
                note="No vehicle access to the rear." if gates_fail else "ok",
            )
        ],
        factors=[
            Factor(key="access", name="Vehicle access", weight=30, score=45, note="tight"),
            Factor(key="size", name="DADU size", weight=20, score=88, note="880 sf"),
        ],
    )


def request(
    hoa: float | None = 0, description: str = "", score: float = 75, gates_fail: bool = False, listing_lot: float = 6800
) -> AssessRequest:
    return AssessRequest(
        listing=ListingIn(
            mls_id="t1", address="2722 NE Blakeley St", hoa_monthly=hoa, lot_sqft=listing_lot, description=description
        ),
        lot=LotIn(lot_sqft=6800, lot_type="interior"),
        facts=[
            Fact(label="F1", text="Address: 2722 NE Blakeley St", source="listing feed"),
            Fact(label="F2", text="HOA: none", source="listing feed"),
            Fact(label="F3", text="Largest DADU the lot allows: 880 sf", source="city GIS"),
        ],
        site=site(score, gates_fail),
        grade_bands=BANDS,
    )


def analysis(**over: Any) -> Analysis:
    base = {
        "reasoning": "r",
        "verdict": "candidate",
        "headline": "Looks like a candidate.",
        "findings": [
            {"claim": "There is no HOA.", "cites": ["F2", "P1"]},
            {"claim": "A DADU of up to 880 sf fits.", "cites": ["F3"]},
        ],
        "confirm": [],
        "adjustments": [],
    }
    base.update(over)
    return Analysis.model_validate(base)
