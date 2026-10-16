"""FAISS index management — build, save, load, query.

One index per repo. Chunk metadata is stored alongside as JSON so we
can map FAISS row indices back to `{file_id, file_path, extract, ...}`.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

import faiss
import numpy as np

from search.embeddings import embed
from utils.paths import CACHE_DIR


# Per-repo locks so concurrent chat requests don't rebuild the same index twice.
_locks: dict[str, threading.Lock] = {}
_locks_meta = threading.Lock()


def _lock_for(repo_id: str) -> threading.Lock:
    with _locks_meta:
        if repo_id not in _locks:
            _locks[repo_id] = threading.Lock()
        return _locks[repo_id]


def _paths(repo_id: str) -> tuple[Path, Path]:
    return (
        CACHE_DIR / f"{repo_id}.faiss",
        CACHE_DIR / f"{repo_id}.chunks.json",
    )


def build_and_persist(repo_id: str, chunks: list[dict]) -> int:
    """Compute embeddings, build a FAISS index, and persist both to disk.
    Returns the number of chunks indexed."""
    faiss_path, chunks_path = _paths(repo_id)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    if not chunks:
        # Wipe any stale files.
        for p in (faiss_path, chunks_path):
            if p.exists():
                p.unlink()
        return 0

    texts = [c["text"] for c in chunks]
    vectors = embed(texts)  # (N, dim), already L2-normalized

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    faiss.write_index(index, str(faiss_path))
    chunks_path.write_text(json.dumps(chunks, ensure_ascii=False), encoding="utf-8")
    return len(chunks)


def load(repo_id: str) -> tuple[faiss.Index, list[dict]] | None:
    faiss_path, chunks_path = _paths(repo_id)
    if not faiss_path.exists() or not chunks_path.exists():
        return None
    index = faiss.read_index(str(faiss_path))
    chunks = json.loads(chunks_path.read_text(encoding="utf-8"))
    return index, chunks


def ensure_ready(repo_id: str) -> tuple[faiss.Index, list[dict]] | None:
    """Return the loaded index — building it from the DB blob if it's missing.
    Returns None if the repo has no chunkable files (e.g. a pre-Phase-4
    analysis with unparsed JS files); callers should surface a re-analyze hint.
    """
    payload = load(repo_id)
    if payload is not None:
        return payload

    with _lock_for(repo_id):
        # Double-check under lock — another thread may have finished the rebuild.
        payload = load(repo_id)
        if payload is not None:
            return payload

        # Lazy imports to avoid circular deps.
        from models.db import get_repo
        from search.chunker import build_chunks

        repo = get_repo(repo_id)
        if repo is None:
            return None

        chunks = build_chunks(repo["data"].get("files", []))
        if not chunks:
            return None  # nothing to embed — pre-Phase-4 stub files
        build_and_persist(repo_id, chunks)
        return load(repo_id)


def query(repo_id: str, query_text: str, k: int = 6) -> list[dict]:
    """Return top-k chunks with scores, deduped by file_id (best chunk per file).
    Each hit has: {file_id, file_path, chunk_type, name, extract, score}."""
    payload = ensure_ready(repo_id)
    if payload is None:
        return []
    index, chunks = payload
    if not chunks:
        return []

    q = embed([query_text])
    # Ask for extra results so we can dedupe by file and still return k unique files.
    top_n = min(len(chunks), max(k * 3, 20))
    scores, indices = index.search(q, top_n)

    seen_files: set[str] = set()
    hits: list[dict] = []
    for score, idx in zip(scores[0].tolist(), indices[0].tolist()):
        if idx < 0 or idx >= len(chunks):
            continue
        c = chunks[idx]
        fid = c["file_id"]
        if fid in seen_files:
            continue
        seen_files.add(fid)
        hits.append({
            **c,
            "score": float(score),
        })
        if len(hits) >= k:
            break
    return hits
