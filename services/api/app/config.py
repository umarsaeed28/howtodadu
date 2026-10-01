"""Settings from the environment. Every external service is optional: when its key is missing, that part is off."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://pencil:pencil@localhost:5432/pencil"
    documents_dir: str = "/app/documents"

    # Shared secret: the Next.js server sends it as x-api-key. Empty disables the check (local dev only).
    pencil_api_key: str = ""

    anthropic_api_key: str = ""
    groq_api_key: str = ""
    jina_api_key: str = ""

    # Model tiers. Small runs on Groq (free); mid and large are Claude. Small falls back to mid without a Groq key.
    small_model: str = "llama-3.1-8b-instant"
    mid_model: str = "claude-haiku-4-5-20251001"
    large_model: str = "claude-sonnet-5-5"
    embedding_model: str = "jina-embeddings-v3"
    embedding_dims: int = 1024

    # Token budgets and cache (see app/agents.py).
    run_token_budget: int = 5000
    daily_token_budget: int = 1_500_000
    cache_ttl_hours: int = 168
    rate_limit_per_hour: int = 20

    sentry_dsn: str = ""
    environment: str = "development"
    opik_api_key: str = ""
    opik_workspace: str = ""
    opik_project_name: str = "pencil"


@lru_cache
def get_settings() -> Settings:
    return Settings()
