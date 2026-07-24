"""Tool registry — the agent and API read from this."""

from __future__ import annotations

from typing import Any, Dict, List

from .base import BaseTool, ToolResult


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool, *, replace: bool = True) -> BaseTool:
        if tool.name in self._tools and not replace:
            raise ValueError(f"Tool '{tool.name}' already registered")
        self._tools[tool.name] = tool
        return tool

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def get(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def all(self) -> List[BaseTool]:
        return list(self._tools.values())

    def names(self) -> List[str]:
        return list(self._tools.keys())

    def openai_schema(self) -> List[Dict[str, Any]]:
        return [t.openai_schema() for t in self._tools.values()]

    def describe(self) -> List[Dict[str, Any]]:
        """Human/JSON-friendly listing for /api/tools."""
        return [
            {"name": t.name, "description": t.description, "parameters": t.parameters}
            for t in self._tools.values()
        ]

    def run(self, name: str, arguments: Dict[str, Any] | None = None) -> ToolResult:
        tool = self._tools.get(name)
        if tool is None:
            return ToolResult(ok=False, error=f"unknown tool '{name}'")
        return tool.run(**(arguments or {}))


#: The default global registry. Import and register onto this.
registry = ToolRegistry()
