"""The DADU assessment as a LangGraph state graph.

    gate ─▶ extract ─▶ hyde ─▶ retrieve ─▶ plan ─▶ analyze ─▶ validate ─▶ decide ─▶ render
     │                            │          │
     └──────── excluded ──────────┴─ no passages / over budget ─▶ END (rules-only result)

Code nodes: gate, retrieve, plan, validate, decide, render. Model nodes: extract and hyde (small tier, Groq),
analyze (mid tier, Claude Haiku; large tier, Claude Sonnet, when the case is close). Hard gates never reach a
model. Every model call is metered; over the run or daily budget the graph returns the rules-only score.
"""

from __future__ import annotations

import operator
import time
from dataclasses import dataclass
from typing import Annotated, Any, Literal, TypedDict

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph

from . import prompts
from .agents import AGENTS
from .budget import RunMeter
from .llm import Model, Tier
from .schemas import (
    Analysis,
    Assessment,
    AssessRequest,
    Citation,
    ExtractResult,
    Fact,
    Finding,
    Passage,
    ScoreDecision,
    TraceStep,
)
from .store import Store
from .validate import FEATURE_TEXT, check_extracted, enforce_verdict, validate_adjustments, validate_findings


@dataclass
class Deps:
    models: dict[Tier, Model | None]
    store: Store
    meter: RunMeter
    daily_left: int


class State(TypedDict, total=False):
    req: AssessRequest
    facts: list[Fact]
    extracted: list[tuple[str, str]]
    hyde: str
    passages: list[Passage]
    analyst: Tier
    reasons: list[str]
    room: int
    analysis: Analysis
    kept: list[Finding]
    dropped: list[tuple[str, str]]
    verdict: Literal["candidate", "not_candidate", "unverified"]
    extra_confirm: list[str]
    score: ScoreDecision | None
    result: Assessment
    trace: Annotated[list[TraceStep], operator.add]
    models: Annotated[list[str], operator.add]


def _t(node: str, kind: Literal["deterministic", "llm"], t0: float, ok: bool, note: str) -> list[TraceStep]:
    return [TraceStep(node=node, kind=kind, ms=int((time.monotonic() - t0) * 1000), ok=ok, note=note)]


def _grade(score: float, req: AssessRequest) -> tuple[int, str]:
    for b in sorted(req.grade_bands, key=lambda b: -b.min):
        if score >= b.min:
            return b.tier, b.label
    return 0, "Marginal"


def _rules_only(req: AssessRequest) -> ScoreDecision | None:
    s = req.site
    if not s or not s.eligible:
        return None
    return ScoreDecision(
        baseline_score=s.score, score=s.score, tier=s.tier, grade=s.grade, adjustments=[], rejected=[], decided_by="rules"
    )


def _usd(n: float) -> str:
    return f"${round(n):,}"


def build_graph(deps: Deps) -> Any:
    meter = deps.meter

    def gate(state: State) -> State:
        t0 = time.monotonic()
        req = state["req"]
        hoa = req.listing.hoa_monthly
        if hoa is not None and hoa > 0:
            headline = f"Not a candidate. This property has an HOA ({_usd(hoa)} per month), and a property with an HOA is never a DADU candidate."
            return {
                "result": Assessment(verdict="excluded", headline=headline, text=headline),
                "trace": _t("gate", "deterministic", t0, True, f"HOA of {_usd(hoa)} per month: excluded"),
            }
        failed = [g for g in (req.site.gates if req.site else []) if g.status == "fail"]
        if failed:
            headline = "Not a candidate. " + " ".join(g.note for g in failed)
            return {
                "result": Assessment(verdict="excluded", headline=headline, text=headline),
                "trace": _t("gate", "deterministic", t0, True, "failed: " + ", ".join(g.label for g in failed)),
            }
        if deps.daily_left <= 0:
            headline = "The AI review is paused for today (token budget reached). This is the rules score from the site guide."
            return {
                "result": Assessment(verdict="unverified", headline=headline, text=headline, score=_rules_only(req)),
                "trace": _t("budget", "deterministic", t0, False, "daily token budget reached: rules-only"),
            }
        return {"facts": list(req.facts), "trace": _t("gate", "deterministic", t0, True, "no exclusion")}

    def extract(state: State, config: RunnableConfig) -> State:
        t0 = time.monotonic()
        desc = state["req"].listing.description.strip()
        small = deps.models.get("small")
        if not desc or small is None:
            return {
                "extracted": [],
                "trace": _t("extract", "llm", t0, True, "skipped: " + ("no small model" if desc else "no listing text")),
            }
        i = len(meter.calls)
        try:
            res, u = small.structured(
                ExtractResult, prompts.EXTRACT_SYSTEM, desc[:2500], AGENTS.nodes["extract"].max_tokens, config
            )
            meter.add(u)
            kept = check_extracted([(x.feature, x.quote) for x in res.features], desc)
            facts = list(state["facts"])
            for feat, quote in kept:
                facts.append(
                    Fact(
                        label=f"F{len(facts) + 1}",
                        text=f'Listing text mentions {FEATURE_TEXT[feat]}: "{quote}"',
                        source="listing description",
                    )
                )
            return {
                "extracted": kept,
                "facts": facts,
                "models": [small.name],
                "trace": _t("extract", "llm", t0, True, f"{len(kept)} kept of {len(res.features)}{meter.note(i)}"),
            }
        except Exception as e:  # extraction is optional
            return {"extracted": [], "trace": _t("extract", "llm", t0, False, f"skipped: {str(e)[:80]}")}

    def hyde(state: State, config: RunnableConfig) -> State:
        t0 = time.monotonic()
        small = deps.models.get("small")
        if small is None:
            return {"hyde": "", "trace": _t("hyde", "llm", t0, False, "skipped: no small model")}
        block = "\n".join(f"{f.label} {f.text}" for f in state["facts"])
        i = len(meter.calls)
        try:
            text, u = small.text(prompts.HYDE_SYSTEM, block, AGENTS.nodes["hyde"].max_tokens, config)
            meter.add(u)
            ok = 20 < len(text) < 900
            return {
                "hyde": text if ok else "",
                "models": [small.name],
                "trace": _t(
                    "hyde",
                    "llm",
                    t0,
                    ok,
                    ("hypothetical passage written" if ok else "rejected, searching without it") + meter.note(i),
                ),
            }
        except Exception as e:
            return {"hyde": "", "trace": _t("hyde", "llm", t0, False, f"skipped: {str(e)[:80]}")}

    def retrieve(state: State) -> State:
        t0 = time.monotonic()
        req = state["req"]
        r = AGENTS.retrieve
        lot_type = req.lot.lot_type if req.lot and req.lot.lot_type else "single-family"
        hoa = "unknown HOA" if req.listing.hoa_monthly is None else "no HOA"
        question = f"DADU screening rules for a {lot_type} lot with {hoa} in Seattle"
        extra: list[str] = []
        if req.site and req.site.eligible:
            weakest = sorted(req.site.factors, key=lambda f: f.score)[:2]
            extra = [
                "How the DADU site score, factors and grades work; " + " and ".join(f.name.lower() for f in weakest),
                "Market fit for a DADU: target size, price and oversupplied unit types",
            ]
        lists = [deps.store.search(question, k=r.k, hyde=state.get("hyde", ""))]
        for q in extra:
            try:
                lists.append(deps.store.search(q, k=r.extra_query_k))
            except Exception:
                lists.append([])
        seen: set[str] = set()
        out: list[Passage] = []
        for p in (p for lst in lists for p in lst):
            if p.id in seen:
                continue
            seen.add(p.id)
            text = p.text if len(p.text) <= r.max_chars_per_passage else p.text[: r.max_chars_per_passage] + "…"
            out.append(p.model_copy(update={"label": f"P{len(out) + 1}", "text": text}))
            if len(out) >= r.max_passages:
                break
        note = f"{len(out)} passages from {len({p.doc_id for p in out})} documents" + (" (HyDE)" if state.get("hyde") else "")
        if not out:
            headline = "Data unavailable in retrieved sources. The knowledge base returned nothing for this property."
            res = Assessment(
                verdict="unverified",
                headline=headline,
                text=headline,
                confirm=["Ingest the knowledge base."],
                unavailable=["All DADU rules"],
                score=_rules_only(req),
            )
            return {"passages": [], "result": res, "trace": _t("retrieve", "deterministic", t0, False, note)}
        return {"passages": out, "trace": _t("retrieve", "deterministic", t0, True, note)}

    def plan(state: State) -> State:
        """Pick the analyst model and its token room. Escalate when the case is close; stop when over the run budget."""
        t0 = time.monotonic()
        req = state["req"]
        e = AGENTS.escalate
        reasons: list[str] = []
        if (
            req.site
            and req.site.eligible
            and any(b.min > 0 and abs(req.site.score - b.min) <= e.near_boundary_pts for b in req.grade_bands)
        ):
            reasons.append("near a grade boundary")
        if e.on_extracted_signals and state.get("extracted"):
            reasons.append("listing text adds access or unit features")
        if (
            e.on_conflicts
            and req.lot
            and req.listing.lot_sqft > 0
            and abs(req.listing.lot_sqft - req.lot.lot_sqft) / max(1.0, req.lot.lot_sqft) > 0.1
        ):
            reasons.append("listing and city lot sizes disagree")
        tier: Tier = "large" if reasons and deps.models.get("large") else "mid"
        if deps.models.get(tier) is None:
            raise RuntimeError("No model is configured for the analysis (set ANTHROPIC_API_KEY).")
        room = min(AGENTS.nodes["analyze"].max_tokens, meter.left - 2500)
        if room < 300:
            headline = "The AI review was skipped for this run (token budget). This is the rules score from the site guide."
            res = Assessment(verdict="unverified", headline=headline, text=headline, score=_rules_only(req))
            return {
                "result": res,
                "trace": _t("budget", "deterministic", t0, False, f"run token budget reached ({meter.total} used): rules-only"),
            }
        return {
            "analyst": tier,
            "reasons": reasons,
            "room": room,
            "trace": _t(
                "plan", "deterministic", t0, True, f"{tier} model" + (f" (escalated: {', '.join(reasons)})" if reasons else "")
            ),
        }

    def analyze(state: State, config: RunnableConfig) -> State:
        t0 = time.monotonic()
        req = state["req"]
        model = deps.models[state["analyst"]]
        assert model is not None
        facts = "\n".join(f"{f.label} {f.text}" for f in state["facts"])
        passages = "\n\n".join(f"{p.label} [{p.doc_id} > {p.section}] {p.text}" for p in state["passages"])
        ask = (
            "Screen this listing and decide its score: keep the rules baseline or adjust it."
            if req.site and req.site.eligible
            else "Screen this listing. There is no baseline score for it."
        )
        i = len(meter.calls)
        a, u = model.structured(
            Analysis, prompts.ANALYZE_SYSTEM, f"FACTS:\n{facts}\n\nPASSAGES:\n{passages}\n\n{ask}", state["room"], config
        )
        meter.add(u)
        note = f"{model.name}: verdict {a.verdict}, {len(a.findings)} findings, {len(a.adjustments)} score adjustments{meter.note(i)}"
        return {"analysis": a, "models": [model.name], "trace": _t("analyze", "llm", t0, True, note)}

    def validate(state: State) -> State:
        t0 = time.monotonic()
        req = state["req"]
        a = state["analysis"]
        v = validate_findings(a.findings, state["passages"], state["facts"])
        verdict, extra = enforce_verdict(
            a, has_lot=req.lot is not None, hoa_known=req.listing.hoa_monthly is not None, kept_findings=len(v.kept)
        )
        note = f"{len(v.kept)} kept, {len(v.dropped)} dropped" + (f" ({v.dropped[0][1]})" if v.dropped else "")
        return {
            "kept": v.kept,
            "dropped": v.dropped,
            "verdict": verdict,
            "extra_confirm": extra,
            "trace": _t("validate", "deterministic", t0, not v.dropped, note),
        }

    def decide(state: State) -> State:
        t0 = time.monotonic()
        req = state["req"]
        site = req.site
        if not site or not site.eligible:
            return {"score": None, "trace": _t("decide score", "deterministic", t0, True, "no baseline for this lot")}
        v = validate_adjustments(
            state["analysis"].adjustments, state["passages"], state["facts"], [f.name for f in site.factors], site.score
        )
        tier, grade = _grade(v.score, req)
        d = ScoreDecision(
            baseline_score=site.score,
            score=v.score,
            tier=tier,
            grade=grade,
            adjustments=v.kept,
            rejected=v.rejected,
            decided_by="ai",
        )
        note = f"{site.score:g} -> {v.score:g} ({grade}), {len(v.kept)} adjustments kept, {len(v.rejected)} rejected" + (
            f" ({v.rejected[0].reason})" if v.rejected else ""
        )
        return {"score": d, "trace": _t("decide score", "deterministic", t0, not v.rejected, note)}

    def render(state: State) -> State:
        a = state["analysis"]
        kept = state["kept"]
        decided = state.get("score")
        used = {c for f in kept for c in f.cites} | {c for adj in (decided.adjustments if decided else []) for c in adj.cites}
        cites = [Citation(label=p.label, doc_id=p.doc_id, section=p.section) for p in state["passages"] if p.label in used]
        cites += [
            Citation(label=f.label, doc_id=f.source, section=f.text.split(":")[0]) for f in state["facts"] if f.label in used
        ]
        unavailable = [c for c, _ in state["dropped"]]
        confirm = (list(a.confirm) + state["extra_confirm"])[:6]
        headline = (
            a.headline
            if kept
            else "Data unavailable in retrieved sources. None of the model's findings could be tied to a source."
        )
        lines = [headline, "", *(f"- {f.claim} [{', '.join(f.cites)}]" for f in kept)]
        if confirm:
            lines += ["", "To confirm:", *(f"- {c}" for c in confirm)]
        res = Assessment(
            verdict=state["verdict"],
            headline=headline,
            findings=kept,
            confirm=confirm,
            unavailable=unavailable,
            citations=cites,
            text="\n".join(lines),
            score=state.get("score"),
        )
        return {"result": res}

    def stop_or(nxt: str) -> Any:
        return lambda s: END if s.get("result") is not None else nxt

    g = StateGraph(State)
    for name, fn in [
        ("gate", gate),
        ("extract", extract),
        ("hyde", hyde),
        ("retrieve", retrieve),
        ("plan", plan),
        ("analyze", analyze),
        ("validate", validate),
        ("decide", decide),
        ("render", render),
    ]:
        g.add_node(name, fn)  # type: ignore[call-overload]
    g.add_edge(START, "gate")
    g.add_conditional_edges("gate", stop_or("extract"), ["extract", END])
    g.add_edge("extract", "hyde")
    g.add_edge("hyde", "retrieve")
    g.add_conditional_edges("retrieve", stop_or("plan"), ["plan", END])
    g.add_conditional_edges("plan", stop_or("analyze"), ["analyze", END])
    g.add_edge("analyze", "validate")
    g.add_edge("validate", "decide")
    g.add_edge("decide", "render")
    g.add_edge("render", END)
    return g.compile()


def run(req: AssessRequest, deps: Deps, callbacks: list[Any] | None = None) -> Assessment:
    out = build_graph(deps).invoke(
        {"req": req, "trace": [], "models": []}, config={"callbacks": callbacks or [], "run_name": "dadu-assessment"}
    )
    res: Assessment = out["result"]
    return res.model_copy(
        update={"trace": out.get("trace", []), "models": sorted(set(out.get("models", []))), "tokens": deps.meter.total}
    )
