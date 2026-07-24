"""Built-in tools.

`geocode` and `parcel_lookup` are STUBS that return plausible placeholder data
so the framework runs end-to-end today. Replace them with real integrations
using the links/data you provide (King County GIS, Seattle GIS/zoning, an MLS
feed, etc.) — just swap the function body and keep the same ToolResult shape.

`knowledge_search` is REAL: it queries the RAG system in ../rag.
"""

from __future__ import annotations

import hashlib
from typing import Any, Dict

from .base import FunctionTool, ToolResult
from .registry import registry

# --------------------------------------------------------------------------- #
# STUB: geocoding                                                             #
# --------------------------------------------------------------------------- #

# Seattle-ish bounding box, used only to derive stable fake coordinates.
_SEA = {"lat": 47.6062, "lng": -122.3321}


def _stable_unit(seed: str) -> float:
    """Deterministic 0..1 from a string, so stubs are stable per-address."""
    h = hashlib.sha1(seed.encode("utf-8")).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def geocode(address: str) -> ToolResult:
    """STUB. Replace with a real geocoder (e.g. Census, Mapbox, Google)."""
    u1 = _stable_unit(address + "lat")
    u2 = _stable_unit(address + "lng")
    lat = round(_SEA["lat"] + (u1 - 0.5) * 0.12, 6)
    lng = round(_SEA["lng"] + (u2 - 0.5) * 0.16, 6)
    return ToolResult(
        ok=True,
        data={"address": address, "lat": lat, "lng": lng, "city": "Seattle", "state": "WA"},
        source="geocode (stub)",
    )


# --------------------------------------------------------------------------- #
# STUB: parcel / zoning lookup                                               #
# --------------------------------------------------------------------------- #

_ZONES = ["NR1", "NR2", "NR3"]


def parcel_lookup(address: str) -> ToolResult:
    """STUB. Replace with real parcel/GIS + zoning lookups."""
    u = _stable_unit(address + "parcel")
    zone = _ZONES[int(u * len(_ZONES)) % len(_ZONES)]
    lot_sqft = int(3200 + _stable_unit(address + "lot") * 5000)
    near_transit = _stable_unit(address + "transit") > 0.5
    parcel_id = hashlib.sha1(address.encode("utf-8")).hexdigest()[:10].upper()
    overlays = []
    if _stable_unit(address + "eca") > 0.75:
        overlays.append("ECA: steep slope (potential)")
    return ToolResult(
        ok=True,
        data={
            "parcel_id": parcel_id,
            "zone": zone,
            "lot_sqft": lot_sqft,
            "near_transit": near_transit,
            "overlays": overlays,
        },
        source="parcel_lookup (stub)",
    )


# --------------------------------------------------------------------------- #
# REAL: knowledge search over the RAG system                                 #
# --------------------------------------------------------------------------- #


def knowledge_search(query: str, k: int = 6) -> ToolResult:
    """Search the Seattle middle-housing knowledge base (RAG)."""
    try:
        from seattle_rag.config import load_settings as load_rag_settings
        from seattle_rag.query import retrieve
    except Exception as exc:  # rag package not importable
        return ToolResult(ok=False, error=f"knowledge base unavailable: {exc}")

    try:
        rag_settings = load_rag_settings()
        chunks = retrieve(rag_settings, query, top_k=k)
    except RuntimeError as exc:
        # Typically a missing OPENAI_API_KEY; degrade gracefully.
        return ToolResult(ok=False, error=str(exc))
    except Exception as exc:
        return ToolResult(ok=False, error=f"knowledge search failed: {exc}")

    passages = [
        {
            "text": c.text,
            "source": c.source,
            "breadcrumb": c.breadcrumb,
            "distance": round(c.distance, 4),
        }
        for c in chunks
    ]
    return ToolResult(
        ok=True,
        data={"query": query, "passages": passages, "count": len(passages)},
        source="knowledge_base (RAG)",
    )


def register_builtin_tools() -> None:
    registry.register(
        FunctionTool(
            name="geocode",
            description="Resolve a street address to coordinates and city/state. Call first.",
            parameters={
                "type": "object",
                "properties": {"address": {"type": "string", "description": "Street address"}},
                "required": ["address"],
            },
            func=geocode,
        )
    )
    registry.register(
        FunctionTool(
            name="parcel_lookup",
            description=(
                "Look up parcel facts for an address: parcel id, zoning code, lot size "
                "(sqft), transit proximity, and overlays. Use to ground feasibility."
            ),
            parameters={
                "type": "object",
                "properties": {"address": {"type": "string"}},
                "required": ["address"],
            },
            func=parcel_lookup,
        )
    )
    registry.register(
        FunctionTool(
            name="knowledge_search",
            description=(
                "Search the Seattle middle-housing knowledge base (zoning rules, HB 1110, "
                "DADU/ADU, FAR, tree/ECA rules) for passages relevant to a question. Use to "
                "cite rules and confirm what is allowed."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to look up"},
                    "k": {"type": "integer", "description": "Passages to return", "default": 6},
                },
                "required": ["query"],
            },
            func=knowledge_search,
        )
    )


register_builtin_tools()
