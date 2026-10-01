from app.budget import RunMeter
from app.graph import Deps, run
from app.schemas import Adjustment

from .fakes import FakeModel, FakeStore, analysis, request


def deps(
    mid: FakeModel | None = None,
    small: FakeModel | None = None,
    large: FakeModel | None = None,
    daily_left: int = 10**6,
    budget: int = 5000,
) -> Deps:
    return Deps(
        models={"small": small, "mid": mid, "large": large}, store=FakeStore(), meter=RunMeter(budget), daily_left=daily_left
    )


def nodes(a: object) -> list[str]:
    return [t.node for t in a.trace]  # type: ignore[attr-defined]


def test_happy_path_runs_every_node_and_cites_real_sources() -> None:
    mid = FakeModel("haiku", analysis())
    a = run(request(), deps(mid=mid, small=FakeModel("groq")))
    assert nodes(a) == ["gate", "extract", "hyde", "retrieve", "plan", "analyze", "validate", "decide score"]
    assert a.verdict == "candidate"
    assert sorted(c.label for c in a.citations) == ["F2", "F3", "P1"]
    assert a.score is not None and a.score.decided_by == "ai" and a.score.score == 75
    assert a.tokens == 150 + 40 + 900 + 300  # hyde + analyze (no listing text, so no extract call)


def test_hoa_and_failed_gates_never_call_a_model() -> None:
    mid = FakeModel("haiku", analysis())
    a = run(request(hoa=200), deps(mid=mid))
    assert a.verdict == "excluded" and mid.calls == [] and nodes(a) == ["gate"]
    b = run(request(gates_fail=True), deps(mid=mid))
    assert b.verdict == "excluded" and "No vehicle access" in b.headline and mid.calls == []


def test_cited_adjustment_moves_score_and_grade() -> None:
    adj = [Adjustment(factor="Vehicle access", delta=8, reason="There is no HOA.", cites=["F2"])]
    a = run(request(score=75), deps(mid=FakeModel("haiku", analysis(adjustments=[x.model_dump() for x in adj]))))
    assert a.score is not None and a.score.score == 83 and a.score.grade == "Good"


def test_escalates_near_a_grade_boundary_or_when_listing_text_adds_signals() -> None:
    mid, large = FakeModel("haiku", analysis()), FakeModel("sonnet", analysis())
    run(request(score=81), deps(mid=mid, large=large))  # 1 point under Good (82)
    assert large.calls and not mid.calls
    mid2, large2 = FakeModel("haiku", analysis()), FakeModel("sonnet", analysis())
    small = FakeModel("groq", extract={"features": [{"feature": "side_driveway", "quote": "long side driveway to the back"}]})
    a = run(
        request(score=75, description="Bungalow with a long side driveway to the back and a shed."),
        deps(mid=mid2, large=large2, small=small),
    )
    assert large2.calls and not mid2.calls
    assert "listing text adds access or unit features" in next(t.note for t in a.trace if t.node == "plan")
    assert any("Listing text mentions a side driveway" in c.section for c in a.citations) or a.verdict == "candidate"


def test_budget_exhausted_returns_rules_only_without_model_calls() -> None:
    mid = FakeModel("haiku", analysis())
    a = run(request(), deps(mid=mid, daily_left=0))
    assert a.verdict == "unverified" and a.score is not None and a.score.decided_by == "rules" and mid.calls == []
    b = run(request(), deps(mid=mid, budget=2000))  # too little room left in this run for the analysis
    assert b.score is not None and b.score.decided_by == "rules" and "structured:Analysis" not in mid.calls


def test_small_model_failure_is_skipped_not_fatal() -> None:
    a = run(request(description="Has a garage."), deps(mid=FakeModel("haiku", analysis()), small=FakeModel("groq", fail=True)))
    assert a.verdict == "candidate"
    assert next(t for t in a.trace if t.node == "extract").ok is False


def test_no_passages_means_unverified_and_no_analysis() -> None:
    mid = FakeModel("haiku", analysis())
    d = deps(mid=mid)
    d.store = FakeStore(passages=[])
    a = run(request(), d)
    assert a.verdict == "unverified" and "structured:Analysis" not in mid.calls
