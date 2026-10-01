"""Opik tracing for every LLM call and Sentry for errors. Both switch on only when their keys are set."""

from __future__ import annotations

import os
from typing import Any

from .config import Settings


def init_sentry(s: Settings) -> None:
    if not s.sentry_dsn:
        return
    import sentry_sdk

    sentry_sdk.init(dsn=s.sentry_dsn, environment=s.environment, traces_sample_rate=0.1, send_default_pii=False)


def opik_callbacks(s: Settings) -> list[Any]:
    """LangChain callbacks that send each graph run and model call to Opik."""
    if not s.opik_api_key:
        return []
    os.environ.setdefault("OPIK_API_KEY", s.opik_api_key)
    if s.opik_workspace:
        os.environ.setdefault("OPIK_WORKSPACE", s.opik_workspace)
    os.environ.setdefault("OPIK_PROJECT_NAME", s.opik_project_name)
    from opik.integrations.langchain import OpikTracer

    return [OpikTracer(project_name=s.opik_project_name, tags=["dadu-assessment", s.environment])]
