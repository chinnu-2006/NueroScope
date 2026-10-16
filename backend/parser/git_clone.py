"""Thin, cautious wrapper around GitPython for public GitHub clones."""
from __future__ import annotations

import shutil
from pathlib import Path
from typing import Callable

from git import Repo, GitCommandError


def clone_shallow(url: str, dest: Path, on_progress: Callable[[str], None] | None = None) -> Repo:
    """Shallow-clone `url` into `dest`. If `dest` exists, it's replaced."""
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)

    if on_progress:
        on_progress(f"Cloning {url}...")

    try:
        repo = Repo.clone_from(url, dest, depth=1, multi_options=["--single-branch"])
    except GitCommandError as e:
        raise RuntimeError(f"Failed to clone repository: {e.stderr or e}") from e
    return repo


def recent_commits(dest: Path, limit: int = 10) -> list[dict]:
    """Best-effort recent commits. Empty list on any failure."""
    try:
        repo = Repo(dest)
        out = []
        for c in repo.iter_commits(max_count=limit):
            out.append(
                {
                    "sha": c.hexsha[:8],
                    "author": c.author.name,
                    "at": c.committed_datetime.isoformat(),
                    "text": (c.message or "").strip().split("\n", 1)[0][:120],
                }
            )
        return out
    except Exception:
        return []
