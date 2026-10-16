"""Repo-level language mix by file extension.

Not attempting linguist-level accuracy — extension-based is enough for
the UI Language donut and Overview stats.
"""
from pathlib import Path

EXT_LANG = {
    ".py": ("Python", "var(--accent-blue)"),
    ".ts": ("TypeScript", "var(--accent-cyan)"),
    ".tsx": ("TypeScript", "var(--accent-cyan)"),
    ".js": ("JavaScript", "var(--accent-amber)"),
    ".jsx": ("JavaScript", "var(--accent-amber)"),
    ".java": ("Java", "var(--accent-red)"),
    ".go": ("Go", "var(--accent-emerald)"),
    ".rs": ("Rust", "var(--accent-amber)"),
    ".rb": ("Ruby", "var(--accent-red)"),
    ".php": ("PHP", "var(--accent-purple)"),
    ".sql": ("SQL", "var(--accent-amber)"),
    ".html": ("HTML", "var(--accent-red)"),
    ".css": ("CSS", "var(--accent-pink)"),
    ".scss": ("CSS", "var(--accent-pink)"),
    ".sass": ("CSS", "var(--accent-pink)"),
    ".md": ("Markdown", "var(--accent-purple)"),
    ".yaml": ("YAML", "var(--accent-emerald)"),
    ".yml": ("YAML", "var(--accent-emerald)"),
    ".json": ("JSON", "var(--accent-cyan)"),
    ".sh": ("Shell", "var(--accent-emerald)"),
}

# Paths inside a repo we always skip.
SKIP_DIRS = {
    ".git", "node_modules", "venv", ".venv", "env", ".env",
    "__pycache__", "dist", "build", ".next", ".nuxt", "target",
    "coverage", ".mypy_cache", ".pytest_cache", ".idea", ".vscode",
    ".ruff_cache",
}


def walk_source_files(root: Path):
    """Yield (Path, lang) tuples for every code-ish file we care about."""
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        ext = p.suffix.lower()
        lang = EXT_LANG.get(ext)
        if not lang:
            continue
        yield p, lang


def _count_lines(p: Path) -> int:
    try:
        with p.open("rb") as f:
            return sum(1 for _ in f)
    except OSError:
        return 0


def compute(root: Path) -> tuple[list[dict], dict]:
    """Return (languages, totals)."""
    by_lang: dict[str, dict] = {}
    total_files = 0
    total_lines = 0

    for p, (lang_name, color) in walk_source_files(root):
        lines = _count_lines(p)
        total_files += 1
        total_lines += lines
        entry = by_lang.setdefault(
            lang_name, {"name": lang_name, "files": 0, "lines": 0, "color": color}
        )
        entry["files"] += 1
        entry["lines"] += lines

    langs = sorted(by_lang.values(), key=lambda e: e["lines"], reverse=True)
    for e in langs:
        e["share"] = round((e["lines"] / total_lines) * 100, 1) if total_lines else 0.0

    totals = {"files": total_files, "lines": total_lines}
    return langs, totals
