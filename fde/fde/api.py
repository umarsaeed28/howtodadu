"""FastAPI app exposing the feasibility framework + serving the UI."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .config import WEB_DIR, load_settings
from .pipeline import run_feasibility
from .tools.registry import registry

app = FastAPI(title="Pencil FDE — Feasibility", version="0.1.0")


class FeasibilityRequest(BaseModel):
    address: str


@app.get("/", include_in_schema=False)
def index():
    index_html = WEB_DIR / "index.html"
    if not index_html.exists():
        return JSONResponse({"error": "UI not found"}, status_code=404)
    return FileResponse(index_html)


@app.get("/api/health")
def health():
    s = load_settings()
    return {
        "status": "ok",
        "mode": "mock" if s.mock else "live",
        "chat_model": s.chat_model,
        "rag_available": s.rag_available,
        "tools": registry.names(),
    }


@app.get("/api/tools")
def tools():
    return {"tools": registry.describe()}


@app.post("/api/feasibility")
def feasibility(req: FeasibilityRequest):
    address = (req.address or "").strip()
    if not address:
        raise HTTPException(status_code=400, detail="address is required")
    try:
        report = run_feasibility(address)
    except Exception as exc:  # surface a clean error to the UI
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
    return report.model_dump()
