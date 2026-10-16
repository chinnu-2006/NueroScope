"""Deterministic summaries used when GEMINI_API_KEY is unset.

Phase 2 needs *some* AI summary in the Overview and per-file details, and
we don't want to be blocked on the Gemini wiring (Phase 4). This produces
contextual, non-generic text purely from parsed metadata, so demos still
feel intelligent.
"""
from __future__ import annotations

from collections import Counter


def repo_summary(overview: dict, files: list[dict], edges: list[dict]) -> str:
    langs = overview["languages"]
    total_files = overview["stats"]["files"]
    total_lines = overview["stats"]["totalLines"]
    fn_count = overview["stats"]["functions"]
    cls_count = overview["stats"]["classes"]

    top_lang = langs[0]["name"] if langs else "code"
    other = ", ".join(l["name"] for l in langs[1:3]) if len(langs) > 1 else ""

    # Most-connected file = highest in+out edges
    conn = Counter()
    for e in edges:
        conn[e["source"]] += 1
        conn[e["target"]] += 1
    most = conn.most_common(1)
    hub = most[0][0] if most else None

    parts = [
        f"{overview['name']} is a {top_lang.lower()} codebase" + (f" with {other}" if other else "") + ".",
        f"It spans {total_files:,} files and roughly {total_lines:,} lines of source, "
        f"organized into {cls_count} classes and {fn_count} functions.",
    ]
    if hub:
        parts.append(
            f"The most-connected module is `{hub}`, referenced across the dependency graph — "
            f"a strong signal that it's core infrastructure."
        )
    return " ".join(parts)


def file_explanation(file: dict, level: str = "intermediate") -> str:
    """Cheap per-file summary. Levels shape the tone."""
    n_cls = len(file.get("classes", []))
    n_fn = len(file.get("functions", []))
    doc = (file.get("docstring") or "").strip()

    lead = doc.split("\n")[0][:200] if doc else ""
    if not lead:
        role = {"test": "test module", "init": "package initializer", "script": "entry-point script"}.get(
            file.get("kind"), "module"
        )
        lead = f"A {role} defining {n_cls} class(es) and {n_fn} function(s)."

    if level == "beginner":
        return lead + " Think of it as a self-contained unit that does one specific job in this codebase."
    if level == "senior":
        return (
            lead
            + f" It sits at complexity {file.get('complexity', 1):.1f} and imports "
            f"{len(file.get('imports', []))} module(s); review its coupling before refactoring."
        )
    if level == "interview":
        return (
            lead
            + " Key discussion points: single responsibility, its inputs and outputs, "
            "how it's tested, and how it would evolve under load."
        )
    return lead  # intermediate default
