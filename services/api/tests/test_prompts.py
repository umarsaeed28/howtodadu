"""The Python prompts must match the TypeScript ones (the local fallback chain uses those)."""

import re
from pathlib import Path

import pytest

from app import prompts

TS = Path(__file__).resolve().parents[3] / "src" / "lib" / "ai" / "prompts.ts"


@pytest.mark.skipif(not TS.exists(), reason="TypeScript sources not present (e.g. inside the Docker image)")
@pytest.mark.parametrize("name", ["HYDE_SYSTEM", "ANALYZE_SYSTEM", "EXTRACT_SYSTEM"])
def test_prompt_in_sync(name: str) -> None:
    m = re.search(rf"export const {name} = `(.*?)`;", TS.read_text(), re.S)
    assert m, name
    assert getattr(prompts, name) == m.group(1).replace("\\`", "`")
