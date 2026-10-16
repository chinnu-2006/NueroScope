"""Risk detectors — pure functions over the parsed files + edge graph.

Each detector produces zero-or-more `findings`. A finding has:
  category      short identifier used by the frontend for filtering + icons
  severity      'low' | 'medium' | 'high'
  file_id       backend file id (may be None for graph-level findings)
  file_path     repo-relative path
  description   one-sentence summary of the risk
  suggestions   {level: str} — level-conditioned improvement suggestions
  metric        the raw number that triggered the finding
"""
from __future__ import annotations

import networkx as nx


# ── per-category, per-level improvement suggestions ────────────────
_SUGGESTIONS: dict[str, dict[str, str]] = {
    "large_file": {
        "beginner": "This file has too many things in one place. Think of it as a room that's overflowing — try grouping related things into smaller files.",
        "intermediate": "Split the file into smaller modules along class or feature boundaries; keep public APIs stable.",
        "senior": "Break by responsibility, extract cohesive submodules, and check for hidden shared state or coupling before splitting.",
        "interview": "Discussion points: single-responsibility principle, cohesion vs coupling, and the testing consequences of oversized modules.",
    },
    "complex_function": {
        "beginner": "This function has many decisions inside it. Try to break it into smaller helper functions — each doing one clear job.",
        "intermediate": "Extract helper functions, use early returns to flatten conditionals, or replace long branch trees with a lookup/strategy.",
        "senior": "High cyclomatic complexity is a proxy for hard-to-test code paths. Split into pure units, cover branches with tests, and prefer polymorphism over conditional trees.",
        "interview": "Talk about McCabe complexity, test-case explosion (~1 case per branch), and refactoring patterns: extract method, replace conditional with polymorphism.",
    },
    "large_class": {
        "beginner": "This class does too many jobs. Consider splitting it into a few smaller classes, each with a clear purpose.",
        "intermediate": "Apply single-responsibility: extract cohesive method groups into collaborators.",
        "senior": "Look for hidden responsibilities and lifecycle concerns; often God-classes hide state machines or service boundaries.",
        "interview": "Cover SRP, refused-bequest smell, composition over inheritance, and how big classes become integration-test surfaces.",
    },
    "high_coupling": {
        "beginner": "This file is connected to many others. Changes here are risky because they can affect a lot of the code at once.",
        "intermediate": "Consider introducing a facade or service layer, and pushing shared types down so many modules can depend on stable interfaces.",
        "senior": "High fan-in/fan-out indicates a hub. Evaluate whether it's essential infrastructure (OK) or a leaking abstraction (refactor). Introduce an anti-corruption layer or event boundary.",
        "interview": "Discuss fan-in vs fan-out, stable dependencies, hexagonal/ports-and-adapters, and how coupling metrics predict change amplification.",
    },
    "circular_dependency": {
        "beginner": "Two or more files depend on each other in a loop. This makes them hard to change safely. Try moving shared parts to a third file.",
        "intermediate": "Break the cycle by extracting shared types/utilities into a lower-level module, or by dependency inversion.",
        "senior": "Cycles violate layering; often a signal of unclear ownership. Extract an interface or event bus; consider whether the cycle points at a missing domain concept.",
        "interview": "Cover Acyclic Dependencies Principle (Uncle Bob), extraction / inversion strategies, and static-analysis tooling used to detect cycles.",
    },
    "unused_file": {
        "beginner": "No other file uses this one. It might be old code that nobody needs anymore. If unsure, ask before deleting.",
        "intermediate": "If it's truly dead code, remove it. If it's an entry point (routes, tests, plugins), add it to the exclusion list.",
        "senior": "Verify via runtime coverage; static import graphs miss dynamic loads (importlib, plugins, DI containers). Prefer marking than removing until covered.",
        "interview": "Talk about dead code detection limits, plugin/discovery patterns, and how dynamic imports break static analysis.",
    },
}


def _suggestion(category: str, level: str = "intermediate") -> dict[str, str]:
    entry = _SUGGESTIONS.get(category, {})
    return {
        "beginner": entry.get("beginner", ""),
        "intermediate": entry.get("intermediate", ""),
        "senior": entry.get("senior", ""),
        "interview": entry.get("interview", ""),
    }


# ── detectors ────────────────────────────────────────────────────
_CODE_LANGS = {"Python", "JavaScript", "TypeScript"}


def _large_files(files: list[dict]) -> list[dict]:
    out = []
    for f in files:
        lines = f.get("lines", 0)
        if f.get("language") not in _CODE_LANGS:
            continue
        if lines >= 500:
            sev = "high" if lines >= 1200 else "medium" if lines >= 800 else "low"
            out.append({
                "category": "large_file",
                "severity": sev,
                "file_id": f["id"],
                "file_path": f["path"],
                "description": f"{f['path']} is {lines:,} lines — hard to hold in your head all at once.",
                "suggestions": _suggestion("large_file"),
                "metric": lines,
            })
    return out


def _complex_functions(files: list[dict]) -> list[dict]:
    out = []
    for f in files:
        if f.get("language") not in _CODE_LANGS:
            continue
        for fn in f.get("functions", []):
            cx = fn.get("complexity", 1) or 1
            if cx >= 10:
                sev = "high" if cx >= 16 else "medium"
                out.append({
                    "category": "complex_function",
                    "severity": sev,
                    "file_id": f["id"],
                    "file_path": f["path"],
                    "description": f"`{fn.get('name','<fn>')}` in {f['path']} has cyclomatic complexity {cx}.",
                    "suggestions": _suggestion("complex_function"),
                    "metric": cx,
                    "target_name": fn.get("name"),
                })
    return out


def _large_classes(files: list[dict]) -> list[dict]:
    out = []
    for f in files:
        if f.get("language") not in _CODE_LANGS:
            continue
        for c in f.get("classes", []):
            methods = c.get("methods", []) or []
            n = len(methods)
            if n >= 20:
                sev = "high" if n >= 30 else "medium"
                out.append({
                    "category": "large_class",
                    "severity": sev,
                    "file_id": f["id"],
                    "file_path": f["path"],
                    "description": f"Class `{c.get('name','<cls>')}` in {f['path']} has {n} methods.",
                    "suggestions": _suggestion("large_class"),
                    "metric": n,
                    "target_name": c.get("name"),
                })
    return out


def _high_coupling(files: list[dict], edges: list[dict]) -> list[dict]:
    counts: dict[str, int] = {}
    for e in edges:
        counts[e["source"]] = counts.get(e["source"], 0) + 1
        counts[e["target"]] = counts.get(e["target"], 0) + 1
    path_to_file = {f["path"]: f for f in files}
    out = []
    for path, n in counts.items():
        if n < 15:
            continue
        f = path_to_file.get(path)
        sev = "high" if n >= 25 else "medium"
        out.append({
            "category": "high_coupling",
            "severity": sev,
            "file_id": f["id"] if f else None,
            "file_path": path,
            "description": f"{path} touches {n} other files (fan-in + fan-out).",
            "suggestions": _suggestion("high_coupling"),
            "metric": n,
        })
    return out


def _circular_deps(edges: list[dict], max_cycles: int = 15) -> list[dict]:
    if not edges:
        return []
    g = nx.DiGraph()
    for e in edges:
        g.add_edge(e["source"], e["target"])
    try:
        cycles = []
        for i, cycle in enumerate(nx.simple_cycles(g)):
            if len(cycle) < 2:
                continue
            cycles.append(cycle)
            if len(cycles) >= max_cycles:
                break
    except Exception:
        return []
    out = []
    for cycle in cycles:
        preview = " → ".join(cycle[:5])
        if len(cycle) > 5:
            preview += " → …"
        preview += f" → {cycle[0]}"
        out.append({
            "category": "circular_dependency",
            "severity": "high",
            "file_id": None,
            "file_path": cycle[0],
            "description": f"Cycle of {len(cycle)} modules: {preview}",
            "suggestions": _suggestion("circular_dependency"),
            "metric": len(cycle),
            "cycle": cycle,
        })
    return out


# Files that look like entry points — never flag them as unused.
_ENTRY_HINTS = (
    "__init__.py", "__main__.py", "main.py", "app.py", "server.py", "wsgi.py", "asgi.py",
    "manage.py", "cli.py", "setup.py", "conftest.py",
    "index.js", "index.jsx", "index.ts", "index.tsx",
    "main.jsx", "main.tsx", "server.js", "server.ts",
)


def _unused_files(files: list[dict], edges: list[dict]) -> list[dict]:
    targets: set[str] = {e["target"] for e in edges}
    out = []
    for f in files:
        if f.get("language") not in _CODE_LANGS:
            continue
        if f.get("kind") in ("test", "init", "script", "config"):
            continue
        p = f["path"]
        if any(p.endswith(h) or p == h for h in _ENTRY_HINTS):
            continue
        if p in targets:
            continue
        out.append({
            "category": "unused_file",
            "severity": "low",
            "file_id": f["id"],
            "file_path": p,
            "description": f"{p} is not imported by any other file.",
            "suggestions": _suggestion("unused_file"),
            "metric": 0,
        })
    return out


# ── public entry point ────────────────────────────────────────────
def detect(files: list[dict], edges: list[dict]) -> dict:
    findings: list[dict] = []
    findings.extend(_large_files(files))
    findings.extend(_complex_functions(files))
    findings.extend(_large_classes(files))
    findings.extend(_high_coupling(files, edges))
    findings.extend(_circular_deps(edges))
    findings.extend(_unused_files(files, edges))

    # Score: 0-10, weighted by severity totals and normalized against a
    # reasonable ceiling. Kept simple + monotonic.
    weights = {"high": 3, "medium": 1.5, "low": 0.5}
    raw = sum(weights[f["severity"]] for f in findings)
    score = round(min(10.0, raw / 25.0 * 10.0), 1)

    by_cat: dict[str, int] = {}
    by_sev: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
    for f in findings:
        by_cat[f["category"]] = by_cat.get(f["category"], 0) + 1
        by_sev[f["severity"]] += 1

    # Sort: high first, then largest metric first.
    sev_rank = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: (sev_rank[f["severity"]], -(f.get("metric") or 0)))

    return {
        "score": score,
        "level": "high" if score >= 7 else "moderate" if score >= 4 else "low",
        "counts": {"total": len(findings), "by_category": by_cat, "by_severity": by_sev},
        "findings": findings,
    }
