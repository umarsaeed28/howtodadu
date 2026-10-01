from typing import Any

from fastapi.testclient import TestClient

from app import main
from app.config import Settings, get_settings

from .fakes import FakeModel, FakeStore, analysis, request


class MemRepo:
    def __init__(self) -> None:
        self.saved: dict[tuple[str, str], dict[str, Any]] = {}
        self.tokens = 0
        self.counts: dict[str, int] = {}
        self.fb: list[tuple[str, str, str]] = []

    def cached(self, mls_id: str, facts_hash: str, ttl_hours: int) -> dict[str, Any] | None:
        return self.saved.get((mls_id, facts_hash))

    def save(self, mls_id: str, facts_hash: str, result: dict[str, Any], tokens: int) -> None:
        self.saved[(mls_id, facts_hash)] = result

    def tokens_today(self) -> int:
        return self.tokens

    def add_tokens(self, n: int) -> None:
        self.tokens += n

    def hit(self, key: str, limit: int) -> bool:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key] <= limit

    def add_feedback(self, subject: str, rating: str, comment: str, snapshot: dict[str, Any]) -> str:
        self.fb.append((subject, rating, comment))
        return "id-1"


def client(repo: MemRepo, mid: FakeModel, limit: int = 20) -> TestClient:
    s = Settings(pencil_api_key="secret", rate_limit_per_hour=limit)
    main.app.dependency_overrides = {
        get_settings: lambda: s,
        main.get_repo: lambda: repo,
        main.get_store: lambda: FakeStore(),
        main.get_models: lambda: {"small": None, "mid": mid, "large": None},
        main.get_callbacks: lambda: [],
    }
    return TestClient(main.app)


def body() -> dict[str, Any]:
    return request().model_dump(by_alias=True)


def test_requires_api_key() -> None:
    c = client(MemRepo(), FakeModel("haiku", analysis()))
    assert c.post("/v1/assess", json=body()).status_code == 401


def test_assess_then_cache_hit_makes_no_model_call() -> None:
    repo, mid = MemRepo(), FakeModel("haiku", analysis())
    c = client(repo, mid)
    r1 = c.post("/v1/assess", json=body(), headers={"x-api-key": "secret"})
    assert r1.status_code == 200 and r1.json()["verdict"] == "candidate" and r1.json()["score"]["decidedBy"] == "ai"
    calls = len(mid.calls)
    r2 = c.post("/v1/assess", json=body(), headers={"x-api-key": "secret"})
    assert r2.json()["cached"] is True and len(mid.calls) == calls
    assert repo.tokens > 0


def test_rate_limit_per_client() -> None:
    repo = MemRepo()
    c = client(repo, FakeModel("haiku", analysis()), limit=2)
    codes = []
    for i in range(3):
        b = body()
        b["listing"]["mlsId"] = f"m{i}"  # different listings, so no cache hits
        codes.append(c.post("/v1/assess", json=b, headers={"x-api-key": "secret", "x-client-ip": "1.2.3.4"}).status_code)
    assert codes == [200, 200, 429]


def test_feedback_validated_and_stored() -> None:
    repo = MemRepo()
    c = client(repo, FakeModel("haiku", analysis()))
    h = {"x-api-key": "secret"}
    assert (
        c.post("/v1/feedback", json={"subject": "0820000070", "rating": "down", "comment": "No access"}, headers=h).status_code
        == 200
    )
    assert c.post("/v1/feedback", json={"subject": "x", "rating": "meh"}, headers=h).status_code == 422
    assert repo.fb == [("0820000070", "down", "No access")]
