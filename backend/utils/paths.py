"""Filesystem locations. Everything is anchored at the backend/ folder."""
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPOS_DIR = BACKEND_ROOT / "repos"
CACHE_DIR = BACKEND_ROOT / "cache"
SAMPLES_DIR = BACKEND_ROOT / "samples"
DB_PATH = CACHE_DIR / "neuroscope.db"


def repo_path(repo_id: str) -> Path:
    return REPOS_DIR / repo_id


def ensure_dirs() -> None:
    for d in (REPOS_DIR, CACHE_DIR, SAMPLES_DIR):
        d.mkdir(parents=True, exist_ok=True)
