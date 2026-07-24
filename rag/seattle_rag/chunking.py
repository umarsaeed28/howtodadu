"""Heading-aware markdown chunking.

We split on markdown headers so each chunk keeps its section context (a
breadcrumb like ``Zoning > NR zones > FAR``), then pack paragraphs up to a
token budget with a small overlap. Keeping the heading path in the chunk text
and metadata makes retrieval and citations far more accurate for code/rules
documents.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

_HEADER_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_CODE_FENCE_RE = re.compile(r"^\s*```")


@dataclass
class Chunk:
    text: str
    heading_path: List[str]
    source: str
    index: int

    @property
    def breadcrumb(self) -> str:
        return " > ".join(self.heading_path)


class Tokenizer:
    """Token counter/splitter that uses tiktoken when available.

    Falls back to a word-based approximation so the pipeline still works
    offline or if the tiktoken BPE data cannot be fetched.
    """

    def __init__(self) -> None:
        self._enc = None
        try:  # pragma: no cover - depends on local tiktoken cache/network
            import tiktoken

            self._enc = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self._enc = None

    @property
    def backend(self) -> str:
        return "tiktoken" if self._enc is not None else "word-approx"

    def count(self, text: str) -> int:
        if self._enc is not None:
            return len(self._enc.encode(text))
        return max(1, round(len(text.split()) * 1.3))

    def split_to_size(self, text: str, max_tokens: int, overlap: int) -> List[str]:
        """Split a single oversized block into overlapping windows."""
        if self._enc is not None:
            toks = self._enc.encode(text)
            if len(toks) <= max_tokens:
                return [text]
            step = max(1, max_tokens - overlap)
            out: List[str] = []
            start = 0
            while start < len(toks):
                piece = self._enc.decode(toks[start : start + max_tokens]).strip()
                if piece:
                    out.append(piece)
                if start + max_tokens >= len(toks):
                    break
                start += step
            return out

        words = text.split()
        approx_max = max(1, int(max_tokens / 1.3))
        approx_overlap = int(overlap / 1.3)
        if len(words) <= approx_max:
            return [text]
        step = max(1, approx_max - approx_overlap)
        out = []
        start = 0
        while start < len(words):
            out.append(" ".join(words[start : start + approx_max]))
            if start + approx_max >= len(words):
                break
            start += step
        return out


@dataclass
class _Section:
    heading_path: List[str]
    lines: List[str] = field(default_factory=list)

    def body(self) -> str:
        return "\n".join(self.lines).strip()


def _split_into_sections(text: str) -> List[_Section]:
    """Break markdown into sections keyed by their heading breadcrumb."""
    sections: List[_Section] = []
    stack: List[str] = []  # current heading path (index == level-1)
    current = _Section(heading_path=[])
    in_code = False

    for raw_line in text.splitlines():
        if _CODE_FENCE_RE.match(raw_line):
            in_code = not in_code
            current.lines.append(raw_line)
            continue

        header = None if in_code else _HEADER_RE.match(raw_line)
        if header:
            # Close the section we were building.
            if current.body():
                sections.append(current)
            level = len(header.group(1))
            title = header.group(2).strip()
            stack = stack[: level - 1]
            while len(stack) < level - 1:
                stack.append("")
            stack.append(title)
            current = _Section(heading_path=[h for h in stack if h])
        else:
            current.lines.append(raw_line)

    if current.body():
        sections.append(current)
    return sections


def _paragraphs(body: str) -> List[str]:
    parts = re.split(r"\n\s*\n", body)
    return [p.strip() for p in parts if p.strip()]


def _pack_paragraphs(
    paragraphs: List[str],
    tok: Tokenizer,
    max_tokens: int,
    overlap: int,
) -> List[str]:
    chunks: List[str] = []
    current: List[str] = []
    current_tokens = 0

    def flush() -> None:
        nonlocal current, current_tokens
        if current:
            chunks.append("\n\n".join(current))
            current = []
            current_tokens = 0

    for para in paragraphs:
        ptokens = tok.count(para)

        if ptokens > max_tokens:
            flush()
            chunks.extend(tok.split_to_size(para, max_tokens, overlap))
            continue

        if current and current_tokens + ptokens > max_tokens:
            chunks.append("\n\n".join(current))
            # Start next chunk with a trailing-paragraph overlap for continuity.
            carry: List[str] = []
            carry_tokens = 0
            for prev in reversed(current):
                t = tok.count(prev)
                if carry_tokens + t > overlap and carry:
                    break
                carry.insert(0, prev)
                carry_tokens += t
            current = carry
            current_tokens = carry_tokens

        current.append(para)
        current_tokens += ptokens

    flush()
    return chunks


def chunk_markdown(
    text: str,
    source: str,
    tokenizer: Tokenizer,
    max_tokens: int = 500,
    overlap_tokens: int = 75,
) -> List[Chunk]:
    """Turn one markdown document into heading-aware, size-bounded chunks."""
    chunks: List[Chunk] = []
    index = 0
    for section in _split_into_sections(text):
        body = section.body()
        if not body:
            continue
        for piece in _pack_paragraphs(_paragraphs(body), tokenizer, max_tokens, overlap_tokens):
            breadcrumb = " > ".join(section.heading_path)
            text_with_context = f"[{breadcrumb}]\n\n{piece}" if breadcrumb else piece
            chunks.append(
                Chunk(
                    text=text_with_context,
                    heading_path=section.heading_path,
                    source=source,
                    index=index,
                )
            )
            index += 1
    return chunks
