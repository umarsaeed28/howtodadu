"""Deterministic grounding checks, ported from src/lib/ai/validate.ts. The model never vouches for itself."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .schemas import Adjustment, Analysis, Fact, Finding, Passage, Rejected, Verdict

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")
MAX_ADJUSTMENT = 15


def numbers_in(s: str) -> list[str]:
    """Numbers normalised: "$1,000" and "1000" both become "1000"; "895.0" becomes "895"."""
    out = []
    for n in _NUM.findall(s):
        n = n.replace(",", "")
        n = re.sub(r"\.0+$", "", n)
        out.append(n)
    return out


@dataclass
class FindingsResult:
    kept: list[Finding] = field(default_factory=list)
    dropped: list[tuple[str, str]] = field(default_factory=list)  # (claim, reason)


def validate_findings(findings: list[Finding], passages: list[Passage], facts: list[Fact]) -> FindingsResult:
    """A finding survives only if every label it cites exists and every number in it appears (whole) in those sources."""
    sources = {p.label: p.text.replace(",", "") for p in passages} | {f.label: f.text.replace(",", "") for f in facts}
    res = FindingsResult()
    for f in findings:
        claim = (f.claim or "").strip()
        if not claim:
            continue
        cites = [c.strip().upper() for c in (f.cites or [])]
        if not cites:
            res.dropped.append((claim, "no citation"))
            continue
        unknown = [c for c in cites if c not in sources]
        if unknown:
            res.dropped.append((claim, f"unknown citation {', '.join(unknown)}"))
            continue
        known = set(numbers_in(" ".join(sources[c] for c in cites)))
        missing = [n for n in numbers_in(claim) if n not in known]
        if missing:
            res.dropped.append((claim, f"number {missing[0]} is not in the cited sources"))
            continue
        res.kept.append(Finding(claim=claim, cites=cites))
    return res


def enforce_verdict(a: Analysis, *, has_lot: bool, kept_findings: int) -> tuple[Verdict, list[str]]:
    """Rules the model cannot override: a candidate needs lot facts (a listing that reports no HOA has none); no surviving findings means unverified."""
    extra: list[str] = []
    verdict: Verdict = a.verdict
    if verdict == "candidate":
        if not has_lot:
            verdict = "unverified"
            extra.append("This address is not in the city lot library, so its DADU size is unknown.")
    if not kept_findings:
        verdict = "unverified"
    return verdict, extra


@dataclass
class AdjustmentsResult:
    kept: list[Adjustment]
    rejected: list[Rejected]
    score: float


def validate_adjustments(
    adjs: list[Adjustment], passages: list[Passage], facts: list[Fact], factor_names: list[str], baseline: float
) -> AdjustmentsResult:
    """Keep a score change only if it names a real factor, cites real sources, and its numbers are in them. Total capped at +/-15."""
    names = {n.lower(): n for n in factor_names}
    kept: list[Adjustment] = []
    rejected: list[Rejected] = []
    for a in adjs or []:
        factor = names.get((a.factor or "").strip().lower())
        delta = float(a.delta)
        if not factor:
            rejected.append(Rejected(factor=a.factor, delta=delta, reason="unknown factor"))
            continue
        if delta == 0:
            rejected.append(Rejected(factor=factor, delta=delta, reason="no change"))
            continue
        check = validate_findings([Finding(claim=a.reason or "", cites=a.cites or [])], passages, facts)
        if not check.kept:
            rejected.append(Rejected(factor=factor, delta=delta, reason=check.dropped[0][1] if check.dropped else "empty reason"))
            continue
        d = max(-MAX_ADJUSTMENT, min(MAX_ADJUSTMENT, round(delta)))
        kept.append(Adjustment(factor=factor, delta=d, reason=check.kept[0].claim, cites=check.kept[0].cites))
    total = max(-MAX_ADJUSTMENT, min(MAX_ADJUSTMENT, sum(a.delta for a in kept)))
    return AdjustmentsResult(kept=kept, rejected=rejected, score=max(0.0, min(100.0, round(baseline + total))))


FEATURE_TEXT = {
    "side_driveway": "a side driveway",
    "garage": "a garage",
    "alley_access": "alley access",
    "separate_entry": "a separate entrance",
    "existing_adu": "an existing ADU",
    "lower_unit": "a lower unit with its own kitchen or living space",
    "other": "a relevant lot feature",
}


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", t.lower()).strip()


def check_extracted(items: list[tuple[str, str]], description: str) -> list[tuple[str, str]]:
    """Guardrail: drop any extracted (feature, quote) whose quote is not verbatim in the listing text."""
    d = _norm(description)
    out = [(f, q) for f, q in items if f in FEATURE_TEXT and q and len(_norm(q)) >= 6 and _norm(q) in d]
    return out[:5]
