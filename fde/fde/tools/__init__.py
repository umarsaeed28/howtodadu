"""Pluggable tool framework.

A *tool* is any capability the agent can call to gather facts about a property:
a geocoder, a parcel/GIS lookup, a zoning service, a knowledge search, etc.

To add a tool (this is the main FDE plug-in point):

    from fde.tools import registry, FunctionTool, ToolResult

    def my_lookup(address: str) -> ToolResult:
        data = call_your_api(address)
        return ToolResult(ok=True, data=data, source="MyAPI")

    registry.register(FunctionTool(
        name="my_lookup",
        description="What it does and when to use it.",
        parameters={
            "type": "object",
            "properties": {"address": {"type": "string"}},
            "required": ["address"],
        },
        func=my_lookup,
    ))

Then it's automatically available to the agent and shown at /api/tools.
"""

from .base import BaseTool, FunctionTool, ToolResult
from .registry import ToolRegistry, registry
from . import builtin as _builtin  # noqa: F401  (registers the built-in tools)

__all__ = ["BaseTool", "FunctionTool", "ToolResult", "ToolRegistry", "registry"]
