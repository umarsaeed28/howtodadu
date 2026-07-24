"""High-level entry point used by the API and CLI."""

from __future__ import annotations

from .agent import FeasibilityAgent
from .config import Settings, load_settings
from .schema import FeasibilityReport
from .tools.registry import registry


def run_feasibility(address: str, settings: Settings | None = None) -> FeasibilityReport:
    settings = settings or load_settings()
    agent = FeasibilityAgent(settings, tool_registry=registry)
    return agent.run(address)
