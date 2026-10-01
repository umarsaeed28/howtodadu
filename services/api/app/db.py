"""Postgres access: connection pool, migrations, and the small repo the API needs (cache, budget, rate limit, feedback)."""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from .config import Settings, get_settings

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"
_pool: ConnectionPool | None = None


def pool(s: Settings | None = None) -> ConnectionPool:
    global _pool
    if _pool is None:
        s = s or get_settings()
        _pool = ConnectionPool(s.database_url, min_size=1, max_size=5, open=True, kwargs={"autocommit": True})
    return _pool


def migrate(s: Settings | None = None) -> list[str]:
    applied = []
    with pool(s).connection() as c:
        for f in sorted(MIGRATIONS.glob("*.sql")):
            c.execute(f.read_text())  # every statement is idempotent
            applied.append(f.name)
    return applied


class Repo(Protocol):
    def cached(self, mls_id: str, facts_hash: str, ttl_hours: int) -> dict[str, Any] | None: ...
    def save(self, mls_id: str, facts_hash: str, result: dict[str, Any], tokens: int) -> None: ...
    def tokens_today(self) -> int: ...
    def add_tokens(self, n: int) -> None: ...
    def hit(self, key: str, limit: int) -> bool: ...
    def add_feedback(self, subject: str, rating: str, comment: str, snapshot: dict[str, Any]) -> str: ...


class PgRepo:
    def __init__(self, p: ConnectionPool) -> None:
        self._p = p

    def cached(self, mls_id: str, facts_hash: str, ttl_hours: int) -> dict[str, Any] | None:
        with self._p.connection() as c:
            row = c.execute(
                "select result from assessments where mls_id = %s and facts_hash = %s and created_at > now() - make_interval(hours => %s)",
                (mls_id, facts_hash, ttl_hours),
            ).fetchone()
        return dict(row[0]) if row else None

    def save(self, mls_id: str, facts_hash: str, result: dict[str, Any], tokens: int) -> None:
        with self._p.connection() as c:
            c.execute(
                "insert into assessments (mls_id, facts_hash, result, tokens) values (%s, %s, %s, %s) "
                "on conflict (mls_id, facts_hash) do update set result = excluded.result, tokens = excluded.tokens, created_at = now()",
                (mls_id, facts_hash, Jsonb(result), tokens),
            )

    def tokens_today(self) -> int:
        with self._p.connection() as c:
            row = c.execute("select tokens from token_usage where day = (now() at time zone 'utc')::date").fetchone()
        return int(row[0]) if row else 0

    def add_tokens(self, n: int) -> None:
        if n <= 0:
            return
        with self._p.connection() as c:
            c.execute(
                "insert into token_usage (day, tokens) values ((now() at time zone 'utc')::date, %s) "
                "on conflict (day) do update set tokens = token_usage.tokens + excluded.tokens",
                (n,),
            )

    def hit(self, key: str, limit: int) -> bool:
        """Count one request for `key` in the current hour. False when the limit is already reached."""
        window = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
        with self._p.connection() as c:
            row = c.execute(
                "insert into rate_limits (key, window_start, count) values (%s, %s, 1) "
                "on conflict (key, window_start) do update set count = rate_limits.count + 1 returning count",
                (key, window),
            ).fetchone()
            c.execute("delete from rate_limits where window_start < now() - interval '2 days'")
        return bool(row and int(row[0]) <= limit)

    def add_feedback(self, subject: str, rating: str, comment: str, snapshot: dict[str, Any]) -> str:
        with self._p.connection() as c:
            row = c.execute(
                "insert into feedback (subject, rating, comment, snapshot) values (%s, %s, %s, %s) returning id",
                (subject, rating, comment, Jsonb(snapshot)),
            ).fetchone()
        return str(row[0]) if row else ""


if __name__ == "__main__":
    if sys.argv[1:2] == ["migrate"]:
        print(json.dumps({"applied": migrate()}))
    else:
        print("usage: python -m app.db migrate")
