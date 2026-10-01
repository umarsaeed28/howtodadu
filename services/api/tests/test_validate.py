from app.schemas import Adjustment, Fact, Finding, Passage
from app.validate import check_extracted, numbers_in, validate_adjustments, validate_findings

P = [Passage(label="P1", id="c", doc_id="d", section="s", text="An HOA is never a candidate.", distance=0.1)]
F = [
    Fact(label="F1", text="Largest DADU: 895 sf", source="city GIS"),
    Fact(label="F2", text="Listing says: 12 ft side driveway", source="listing"),
]


def test_numbers_normalised() -> None:
    assert numbers_in("$1,000 and 895.0 sf") == ["1000", "895"]


def test_drops_uncited_unknown_and_invented_numbers() -> None:
    r = validate_findings(
        [
            Finding(claim="No cite", cites=[]),
            Finding(claim="Bad", cites=["P9"]),
            Finding(claim="It can be 1,200 sf.", cites=["F1"]),
            Finding(claim="8 sf", cites=["F1"]),
        ],
        P,
        F,
    )
    assert r.kept == []
    assert [d[1] for d in r.dropped] == [
        "no citation",
        "unknown citation P9",
        "number 1200 is not in the cited sources",
        "number 8 is not in the cited sources",
    ]


def test_keeps_grounded_finding() -> None:
    assert len(validate_findings([Finding(claim="The DADU can be 895 sf.", cites=["F1"])], P, F).kept) == 1


def test_adjustments_capped_and_checked() -> None:
    names = ["Vehicle access", "Layout fit"]
    ok = validate_adjustments(
        [Adjustment(factor="vehicle access", delta=6, reason="A 12 ft side driveway.", cites=["F2"])], P, F, names, 70
    )
    assert ok.score == 76 and ok.kept[0].factor == "Vehicle access"
    bad = validate_adjustments(
        [
            Adjustment(factor="Vibes", delta=5, reason="x", cites=["F2"]),
            Adjustment(factor="Layout fit", delta=5, reason="20 ft driveway", cites=["F2"]),
        ],
        P,
        F,
        names,
        70,
    )
    assert bad.score == 70 and [r.reason for r in bad.rejected] == ["unknown factor", "number 20 is not in the cited sources"]
    cap = validate_adjustments([Adjustment(factor="Layout fit", delta=40, reason="Driveway.", cites=["F2"])], P, F, names, 90)
    assert cap.score == 100


def test_extract_guardrail_requires_verbatim_quote() -> None:
    desc = "Charming home with a detached garage off the alley and a separate entrance to the lower level."
    kept = check_extracted(
        [("garage", "detached garage off the alley"), ("side_driveway", "wide side driveway"), ("separate_entry", "x")], desc
    )
    assert kept == [("garage", "detached garage off the alley")]
