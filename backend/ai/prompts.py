"""Level-conditioned system prompts + context assembly for chat / explain."""
from __future__ import annotations


LEVEL_PROMPTS = {
    "beginner": (
        "You are a friendly programming tutor explaining code to a beginner. "
        "Use simple language. Avoid jargon unless you introduce and define it. "
        "Prefer everyday analogies. Keep answers under 5 short paragraphs."
    ),
    "intermediate": (
        "You are a helpful senior developer explaining code to a mid-level engineer. "
        "Assume familiarity with common patterns. Be concrete and cite files. "
        "Keep answers focused and under 6 paragraphs."
    ),
    "senior": (
        "You are a principal engineer reviewing code with a senior colleague. "
        "Focus on architecture, trade-offs, invariants, hidden constraints, and "
        "non-obvious risks. Cite files by path. Keep it tight."
    ),
    "interview": (
        "You are preparing an engineer for a technical interview about this codebase. "
        "Explain the design at a level that would satisfy an interviewer. "
        "Highlight decisions, trade-offs, and common follow-up questions."
    ),
}


def system_prompt(level: str) -> str:
    return LEVEL_PROMPTS.get(level, LEVEL_PROMPTS["intermediate"])


def render_context(hits: list[dict], max_files: int = 6) -> str:
    """Turn top-k retrieved chunks into a Gemini-friendly context block."""
    if not hits:
        return "(no context retrieved)"
    lines: list[str] = ["Relevant code context (from semantic search):"]
    for i, h in enumerate(hits[:max_files], 1):
        lines.append("")
        lines.append(f"[{i}] {h.get('file_path')} · {h.get('chunk_type')} · {h.get('name')}")
        if h.get("extract"):
            lines.append(f"    {h['extract']}")
    return "\n".join(lines)


def build_chat_user_prompt(query: str, hits: list[dict]) -> str:
    return (
        f"{render_context(hits)}\n\n"
        f"Question: {query}\n\n"
        f"Answer using the context above. If information is missing, say so plainly. "
        f"When you cite a file, use its path in backticks."
    )
