"""Model tiers. Small: Groq (free, fast) for checked jobs. Mid: Claude Haiku. Large: Claude Sonnet.

Every call returns its token usage, so the graph can meter the run. LangChain models carry the run's callbacks,
so Opik traces every call when it is configured.
"""

from __future__ import annotations

from typing import Any, Literal, Protocol, TypeVar

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, SecretStr

from .budget import Usage
from .config import Settings

Tier = Literal["small", "mid", "large"]
T = TypeVar("T", bound=BaseModel)


class Model(Protocol):
    """What the graph needs from a model. Tests pass fakes with the same shape."""

    name: str

    def structured(
        self, schema: type[T], system: str, user: str, max_tokens: int, config: RunnableConfig | None = None
    ) -> tuple[T, Usage]: ...

    def text(self, system: str, user: str, max_tokens: int, config: RunnableConfig | None = None) -> tuple[str, Usage]: ...


def _usage(name: str, msg: Any) -> Usage:
    meta = getattr(msg, "usage_metadata", None) or {}
    details = meta.get("input_token_details") or {}
    return Usage(
        name, int(meta.get("input_tokens", 0)), int(meta.get("output_tokens", 0)), int(details.get("cache_read", 0) or 0)
    )


class LcModel:
    """A LangChain chat model for one tier, with an optional fallback model used if the call fails."""

    def __init__(self, name: str, make: Any, *, cache_system: bool, fallback: LcModel | None = None) -> None:
        self.name = name
        self._make = make  # (max_tokens) -> BaseChatModel
        self._cache_system = cache_system
        self._fallback = fallback

    def _messages(self, system: str, user: str) -> list[BaseMessage]:
        sys: SystemMessage = (
            SystemMessage(content=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}])
            if self._cache_system
            else SystemMessage(content=system)
        )
        return [sys, HumanMessage(content=user)]

    def structured(
        self, schema: type[T], system: str, user: str, max_tokens: int, config: RunnableConfig | None = None
    ) -> tuple[T, Usage]:
        try:
            chat: BaseChatModel = self._make(max_tokens)
            out = chat.with_structured_output(schema, include_raw=True).invoke(self._messages(system, user), config=config)
            parsed = out["parsed"] if isinstance(out, dict) else None
            if parsed is None:
                raise ValueError(f"{self.name} returned no structured result")
            return schema.model_validate(parsed), _usage(self.name, out.get("raw") if isinstance(out, dict) else None)
        except Exception:
            if self._fallback is None:
                raise
            return self._fallback.structured(schema, system, user, max_tokens, config)

    def text(self, system: str, user: str, max_tokens: int, config: RunnableConfig | None = None) -> tuple[str, Usage]:
        try:
            msg = self._make(max_tokens).invoke(self._messages(system, user), config=config)
            content = msg.content if isinstance(msg, AIMessage) else ""
            body = content if isinstance(content, str) else "".join(b.get("text", "") for b in content if isinstance(b, dict))
            return body.strip(), _usage(self.name, msg)
        except Exception:
            if self._fallback is None:
                raise
            return self._fallback.text(system, user, max_tokens, config)


def build_models(s: Settings) -> dict[Tier, Model | None]:
    """The models for each tier from settings. A tier is None when nothing for it is configured."""

    def anthropic(model: str) -> LcModel | None:
        if not s.anthropic_api_key:
            return None
        from langchain_anthropic import ChatAnthropic

        return LcModel(
            model,
            lambda n: ChatAnthropic(
                model=model,
                api_key=SecretStr(s.anthropic_api_key),
                max_tokens=n,
                temperature=0,
                timeout=60,
                stop=None,
            ),
            cache_system=True,
        )

    mid = anthropic(s.mid_model)
    large = anthropic(s.large_model)
    small: LcModel | None = mid
    if s.groq_api_key:
        from langchain_groq import ChatGroq

        small = LcModel(
            s.small_model,
            lambda n: ChatGroq(
                model_name=s.small_model, api_key=SecretStr(s.groq_api_key), max_tokens=n, temperature=0, timeout=20
            ),
            cache_system=False,
            fallback=mid,
        )
    return {"small": small, "mid": mid, "large": large}
