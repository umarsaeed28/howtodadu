"""Pencil API: DADU assessments (LangGraph), knowledge-base search (pgvector), feedback."""

from __future__ import annotations

import hashlib
import json
import logging
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request

from . import graph
from .budget import RunMeter
from .config import Settings, get_settings
from .db import PgRepo, Repo, pool
from .embeddings import JinaEmbedder
from .llm import Model, Tier, build_models
from .schemas import Assessment, AssessRequest, FeedbackIn, Passage, SearchIn
from .store import PgStore, Store
from .tracing import init_sentry, opik_callbacks

logging.basicConfig(level=logging.INFO, format='{"level":"%(levelname)s","logger":"%(name)s","msg":%(message)r}')
log = logging.getLogger("pencil.api")

init_sentry(get_settings())
app = FastAPI(title="Pencil API", version="0.1.0")


# ---- dependencies (overridden in tests) -----------------------------------------------------------


def get_repo() -> Repo:
    return PgRepo(pool())


def get_store(s: Annotated[Settings, Depends(get_settings)]) -> Store:
    return PgStore(pool(s), JinaEmbedder(s))


def get_models(s: Annotated[Settings, Depends(get_settings)]) -> dict[Tier, Model | None]:
    return build_models(s)


def get_callbacks(s: Annotated[Settings, Depends(get_settings)]) -> list[Any]:
    return opik_callbacks(s)


def require_key(s: Annotated[Settings, Depends(get_settings)], x_api_key: Annotated[str, Header()] = "") -> None:
    """The Next.js server calls the API with a shared secret. Browsers never call it directly."""
    if s.pencil_api_key and x_api_key != s.pencil_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


def client_key(request: Request, x_client_ip: Annotated[str, Header()] = "") -> str:
    return x_client_ip or (request.client.host if request.client else "unknown")


def facts_hash(req: AssessRequest) -> str:
    """Anything the run depends on. A change re-runs the listing; otherwise the cached result is served."""
    body = json.dumps(
        {
            "facts": [f.text for f in req.facts],
            "desc": req.listing.description,
            "site": req.site.model_dump() if req.site else None,
        },
        sort_keys=True,
    )
    return hashlib.sha1(body.encode()).hexdigest()[:16]


# ---- routes -------------------------------------------------------------------------------------------


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        with pool().connection() as c:
            c.execute("select 1")
        return {"ok": True, "db": True}
    except Exception:
        return {"ok": True, "db": False}


@app.post("/v1/assess", response_model=Assessment, response_model_by_alias=True, dependencies=[Depends(require_key)])
def assess(
    req: AssessRequest,
    s: Annotated[Settings, Depends(get_settings)],
    repo: Annotated[Repo, Depends(get_repo)],
    store: Annotated[Store, Depends(get_store)],
    models: Annotated[dict[Tier, Model | None], Depends(get_models)],
    callbacks: Annotated[list[Any], Depends(get_callbacks)],
    who: Annotated[str, Depends(client_key)],
) -> Assessment:
    key = facts_hash(req)
    hit = repo.cached(req.listing.mls_id, key, s.cache_ttl_hours)
    if hit:
        return Assessment.model_validate(hit).model_copy(update={"cached": True})
    if not repo.hit(f"assess:{who}", s.rate_limit_per_hour):
        raise HTTPException(status_code=429, detail="Too many assessments from this client. Try again within the hour.")
    deps = graph.Deps(
        models=models, store=store, meter=RunMeter(s.run_token_budget), daily_left=s.daily_token_budget - repo.tokens_today()
    )
    result = graph.run(req, deps, callbacks)
    repo.add_tokens(result.tokens)
    if result.models or result.verdict == "excluded":  # do not cache a run that never reached the model for budget reasons
        repo.save(req.listing.mls_id, key, result.model_dump(by_alias=True), result.tokens)
    log.info(
        json.dumps(
            {
                "event": "assess",
                "mls": req.listing.mls_id,
                "verdict": result.verdict,
                "tokens": result.tokens,
                "models": result.models,
            }
        )
    )
    return result


@app.post("/v1/search", response_model=list[Passage], response_model_by_alias=True, dependencies=[Depends(require_key)])
def search(body: SearchIn, store: Annotated[Store, Depends(get_store)]) -> list[Passage]:
    return store.search(body.question, k=body.k, hyde=body.hyde, scope=body.scope)


@app.post("/v1/feedback", dependencies=[Depends(require_key)])
def feedback(
    body: FeedbackIn, repo: Annotated[Repo, Depends(get_repo)], who: Annotated[str, Depends(client_key)]
) -> dict[str, Any]:
    if not repo.hit(f"feedback:{who}", 60):
        raise HTTPException(status_code=429, detail="Too much feedback from this client.")
    fid = repo.add_feedback(body.subject, body.rating, body.comment.strip(), body.snapshot)
    return {"ok": True, "id": fid}
