"""Retrieval-augmented chat over a repo. RAG pipeline:

  1. Embed the user's question
  2. FAISS top-k retrieval → context chunks
  3. Compose system + user prompt (level-conditioned)
  4. Call Gemini; if unavailable, synthesize a mock answer that still
     cites the retrieved chunks so the UX degrades gracefully.
"""
from __future__ import annotations

from ai import gemini
from ai.prompts import build_chat_user_prompt, system_prompt
from search import index as search_index


def _mock_answer(query: str, level: str, hits: list[dict]) -> str:
    """Compose a decent answer without an LLM — used when GEMINI_API_KEY is unset."""
    if not hits:
        return (
            "This repository doesn't have a searchable AI index yet. It was likely "
            "analyzed before the AI features were added. Click **Analyze Repository** "
            "in the top nav to re-run analysis — it'll parse the source, build "
            "embeddings, and then this assistant will be able to answer questions "
            f"like \"{query}\"."
        )

    intros = {
        "beginner": "Let me walk you through what I found:",
        "intermediate": "Here's what I found in the codebase:",
        "senior": "Based on the parsed structure, these are the most relevant modules:",
        "interview": "Here's a targeted breakdown you can use to prepare:",
    }
    lines = [intros.get(level, intros["intermediate"]), ""]
    seen_paths: set[str] = set()
    for h in hits:
        p = h.get("file_path")
        if p in seen_paths:
            continue
        seen_paths.add(p)
        chunk_type = h.get("chunk_type", "code")
        name = h.get("name") or ""
        extract = h.get("extract") or ""
        lines.append(f"- `{p}` — {chunk_type} `{name}`. {extract}")
        if len(seen_paths) >= 4:
            break
    lines.extend([
        "",
        f"These are the semantic top matches for \"{query}\". "
        "Set GEMINI_API_KEY in backend/.env to get a fuller, model-authored explanation.",
    ])
    return "\n".join(lines)


def answer(repo_id: str, query: str, level: str = "intermediate") -> dict:
    hits = search_index.query(repo_id, query, k=6)
    text: str | None = None
    used_gemini = False
    if gemini.is_available() and hits:
        user_prompt = build_chat_user_prompt(query, hits)
        text = gemini.generate(system_prompt(level), user_prompt)
        used_gemini = bool(text)
    if not text:
        text = _mock_answer(query, level, hits)

    citations = [
        {
            "file_id": h["file_id"],
            "file_path": h["file_path"],
            "chunk_type": h["chunk_type"],
            "name": h.get("name"),
            "extract": h.get("extract"),
            "score": round(h.get("score", 0), 3),
        }
        for h in hits[:4]
    ]

    return {
        "query": query,
        "level": level,
        "answer": text,
        "citations": citations,
        # provider reflects the ANSWER SOURCE, not whether a key is configured.
        "provider": "gemini" if used_gemini else "mock",
        "model": gemini.active_model_name() if used_gemini else None,
    }
