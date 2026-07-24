"""Offline unit tests for the markdown chunker (no network/API needed).

Run with:  python -m pytest rag/tests   (or)   python rag/tests/test_chunking.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from seattle_rag.chunking import Tokenizer, chunk_markdown  # noqa: E402

SAMPLE = """# Title

Intro paragraph under the title.

## Section A

Alpha paragraph one.

Alpha paragraph two.

### Subsection A.1

Nested content here.

## Section B

Beta content.
"""


def test_heading_paths_are_tracked():
    tok = Tokenizer()
    chunks = chunk_markdown(SAMPLE, source="doc.md", tokenizer=tok, max_tokens=200, overlap_tokens=20)
    assert chunks, "expected at least one chunk"
    breadcrumbs = {c.breadcrumb for c in chunks}
    assert "Title > Section A" in breadcrumbs
    assert "Title > Section A > Subsection A.1" in breadcrumbs
    assert "Title > Section B" in breadcrumbs


def test_breadcrumb_prefixed_into_text():
    tok = Tokenizer()
    chunks = chunk_markdown(SAMPLE, source="doc.md", tokenizer=tok, max_tokens=200, overlap_tokens=20)
    a_chunk = next(c for c in chunks if c.breadcrumb == "Title > Section B")
    assert a_chunk.text.startswith("[Title > Section B]")
    assert "Beta content." in a_chunk.text


def test_indices_are_sequential_and_unique():
    tok = Tokenizer()
    chunks = chunk_markdown(SAMPLE, source="doc.md", tokenizer=tok, max_tokens=200, overlap_tokens=20)
    indices = [c.index for c in chunks]
    assert indices == list(range(len(chunks)))


def test_large_section_is_split():
    tok = Tokenizer()
    big = "# Big\n\n" + ("word " * 4000)
    chunks = chunk_markdown(big, source="big.md", tokenizer=tok, max_tokens=100, overlap_tokens=10)
    assert len(chunks) > 1, "a very large section should split into multiple chunks"


def test_code_fence_hashes_not_treated_as_headers():
    tok = Tokenizer()
    md = "# Doc\n\n```\n# not a header\ncode line\n```\n\nAfter code.\n"
    chunks = chunk_markdown(md, source="c.md", tokenizer=tok, max_tokens=200, overlap_tokens=20)
    breadcrumbs = {c.breadcrumb for c in chunks}
    assert breadcrumbs == {"Doc"}


def _run_all():
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"ok  {name}")
            passed += 1
    print(f"\n{passed} passed")


if __name__ == "__main__":
    _run_all()
