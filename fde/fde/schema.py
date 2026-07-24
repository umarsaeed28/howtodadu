"""The feasibility report schema — the stable contract between the agent, the
API, and the UI. Tools and knowledge plug in *around* this; this shape stays put.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

Confidence = str  # "high" | "medium" | "low"


class Citation(BaseModel):
    source: str = Field(description="Where this came from (doc name, tool, or code section).")
    detail: Optional[str] = Field(default=None, description="Section/breadcrumb or extra locator.")


class PropertyContext(BaseModel):
    """Facts gathered about the property (filled in by tools)."""

    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    parcel_id: Optional[str] = None
    zone: Optional[str] = None
    lot_sqft: Optional[float] = None
    near_transit: Optional[bool] = None
    overlays: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)
    raw: Dict[str, Any] = Field(default_factory=dict, description="Unstructured tool payloads.")


class Allowance(BaseModel):
    """A thing the property is (or isn't) allowed to do."""

    label: str
    detail: str
    confidence: Confidence = "medium"
    citations: List[Citation] = Field(default_factory=list)


class BuildScenario(BaseModel):
    """One realistic way to develop the property."""

    name: str
    units: Optional[int] = None
    summary: str
    key_constraints: List[str] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)


class ToolInvocation(BaseModel):
    """A record of one tool call, for transparency/debugging (FDE visibility)."""

    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    ok: bool = True
    source: Optional[str] = None
    error: Optional[str] = None


class FeasibilityReport(BaseModel):
    address: str
    summary: str = Field(description="2-4 sentence plain-language read.")
    property_context: PropertyContext
    allowances: List[Allowance] = Field(default_factory=list)
    scenarios: List[BuildScenario] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    confidence: Confidence = "medium"
    disclaimers: List[str] = Field(default_factory=list)
    tool_trace: List[ToolInvocation] = Field(default_factory=list)
    mode: str = Field(default="live", description="'live' or 'mock'.")
