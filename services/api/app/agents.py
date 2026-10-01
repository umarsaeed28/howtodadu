"""Agent orchestration settings: one place to keep token use low. Mirrors src/lib/ai/agents.config.ts.

1. Code before models (gates, facts, retrieval, validation, the score baseline).
2. Cache by the facts (Settings.cache_ttl_hours); an unchanged listing never re-runs.
3. Smallest model that can do the job: Groq for extraction and query rewriting, Claude Haiku for the read,
   Claude Sonnet only when the case is close.
4. Hard caps: max tokens per call, a budget per run and per day; over budget returns the rules-only score.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class NodeCfg:
    max_tokens: int


@dataclass(frozen=True)
class RetrieveCfg:
    k: int = 6
    extra_query_k: int = 3
    max_passages: int = 10
    max_chars_per_passage: int = 700


@dataclass(frozen=True)
class EscalateCfg:
    near_boundary_pts: float = 3
    on_extracted_signals: bool = True
    on_conflicts: bool = True


@dataclass(frozen=True)
class AgentsCfg:
    nodes: dict[str, NodeCfg] = field(
        default_factory=lambda: {"extract": NodeCfg(220), "hyde": NodeCfg(120), "analyze": NodeCfg(800), "judge": NodeCfg(150)}
    )
    retrieve: RetrieveCfg = RetrieveCfg()
    escalate: EscalateCfg = EscalateCfg()


AGENTS = AgentsCfg()
