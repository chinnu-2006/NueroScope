"""Tiny sqlite3 wrapper — one table, JSON blob per repo.

Blob storage is intentional: the analysis result is a coherent snapshot
served to a single-user SPA, and we never partial-update it. When Phase 4
adds embeddings, those live in FAISS, not here.
"""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

from utils.paths import DB_PATH, ensure_dirs


def _init() -> None:
    ensure_dirs()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS repos (
                id         TEXT PRIMARY KEY,
                name       TEXT NOT NULL,
                owner      TEXT NOT NULL,
                url        TEXT NOT NULL,
                cloned_at  TEXT NOT NULL,
                data       TEXT NOT NULL
            )
            """
        )


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    _init()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_repo(repo_id: str, name: str, owner: str, url: str, data: dict) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO repos VALUES (?, ?, ?, ?, ?, ?)",
            (
                repo_id,
                name,
                owner,
                url,
                datetime.now(timezone.utc).isoformat(),
                json.dumps(data),
            ),
        )


def get_repo(repo_id: str) -> Optional[dict]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM repos WHERE id = ?", (repo_id,)).fetchone()
    if row is None:
        return None
    d = dict(row)
    d["data"] = json.loads(d["data"])
    return d


def list_repos() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, owner, url, cloned_at FROM repos ORDER BY cloned_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_repo(repo_id: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM repos WHERE id = ?", (repo_id,))
