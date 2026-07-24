"""Tool base types."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, Callable, Dict


@dataclass
class ToolResult:
    """Uniform result returned by every tool."""

    ok: bool
    data: Dict[str, Any] = field(default_factory=dict)
    source: str | None = None  # provenance for citations / transparency
    error: str | None = None

    def to_model_payload(self) -> Dict[str, Any]:
        """What gets serialized back to the LLM after a tool call."""
        if not self.ok:
            return {"ok": False, "error": self.error or "tool failed"}
        payload: Dict[str, Any] = {"ok": True, "data": self.data}
        if self.source:
            payload["source"] = self.source
        return payload


class BaseTool(abc.ABC):
    """Interface every tool implements."""

    name: str
    description: str
    #: JSON Schema for the tool's arguments (OpenAI function-calling format).
    parameters: Dict[str, Any]

    @abc.abstractmethod
    def run(self, **kwargs: Any) -> ToolResult:  # pragma: no cover - interface
        ...

    def openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class FunctionTool(BaseTool):
    """Wraps a plain callable into a tool. The easiest way to add a capability."""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        func: Callable[..., ToolResult],
    ) -> None:
        self.name = name
        self.description = description
        self.parameters = parameters
        self._func = func

    def run(self, **kwargs: Any) -> ToolResult:
        try:
            result = self._func(**kwargs)
        except Exception as exc:  # keep the agent loop alive on tool failure
            return ToolResult(ok=False, error=f"{type(exc).__name__}: {exc}")
        if not isinstance(result, ToolResult):
            # Be forgiving: allow tools to return a bare dict.
            return ToolResult(ok=True, data=dict(result) if result else {})
        return result
