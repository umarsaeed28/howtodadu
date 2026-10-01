"""Token accounting for one run, and the per-day budget across runs (stored in Postgres via the repo)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Usage:
    model: str
    input: int
    output: int
    cache_read: int = 0


@dataclass
class RunMeter:
    limit: int
    calls: list[Usage] = field(default_factory=list)

    def add(self, u: Usage) -> None:
        self.calls.append(u)

    @property
    def total(self) -> int:
        return sum(u.input + u.output for u in self.calls)

    @property
    def left(self) -> int:
        return max(0, self.limit - self.total)

    def since(self, i: int) -> Usage:
        part = self.calls[i:]
        return Usage("", sum(u.input for u in part), sum(u.output for u in part), sum(u.cache_read for u in part))

    def note(self, i: int) -> str:
        u = self.since(i)
        if not (u.input or u.output):
            return ""
        return f" · {u.input} in / {u.output} out tokens" + (f", {u.cache_read} cached" if u.cache_read else "")
