"""End-to-end analysis pipeline. Called from a background thread.

Stages, in order:
  1. clone   → shallow clone into backend/repos/{repo_id}/
  2. parse   → language stats + Python AST + JS/TS regex parser
  3. graph   → resolve imports (per-language) → dependency edges
  4. ai      → mock summary (Phase 4 will swap in Gemini)
Finally: persist the whole analysis blob to SQLite.
"""
from __future__ import annotations

import threading
import traceback
from collections import defaultdict
from dataclasses import asdict

from analyzer.jobs import registry
from analyzer.mock_ai import repo_summary
from analyzer.metrics import compute as compute_metrics, overall_complexity, risk_level
from analyzer.risk import detect as detect_risks
from models.db import upsert_repo
from parser.ast_parser import parse_python_file
from parser.js_parser import parse_js_file, language_for as js_language_for
from parser.git_clone import clone_shallow, recent_commits
from parser.language_stats import compute as compute_langs, walk_source_files
from parser.module_resolver import build_module_index, discover_js_aliases, resolve, resolve_js_import
from search.chunker import build_chunks
from search.index import build_and_persist as build_search_index
from utils.hashing import parse_github_url
from utils.paths import repo_path


PY_EXTS = {".py"}
JS_EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}


def run_analysis(job_id: str, repo_id: str, repo_url: str) -> None:
    """Blocking; runs the whole pipeline. Called via `start(...)`."""
    try:
        registry.update(job_id, state="running")

        # ── 1. clone ──────────────────────────────────
        dest = repo_path(repo_id)
        registry.stage(job_id, "clone", state="running", detail="Cloning...")
        clone_shallow(repo_url, dest)
        registry.stage(job_id, "clone", state="done", detail=str(dest.name))

        # ── 2. parse ──────────────────────────────────
        registry.stage(job_id, "parse", state="running", detail="Reading source...")
        languages, totals = compute_langs(dest)

        parsed_files: list[dict] = []
        all_classes: list[dict] = []
        all_functions: list[dict] = []
        py_count = 0
        js_count = 0

        for p, (lang_name, _color) in walk_source_files(dest):
            ext = p.suffix.lower()

            if ext in PY_EXTS:
                pf = parse_python_file(dest, p, repo_id)
                if pf is None:
                    continue
                file_dict = asdict(pf)
                file_dict["language"] = "Python"
                py_count += 1
                for c in pf.classes:
                    all_classes.append({"file_id": pf.id, "file_path": pf.path, **asdict(c)})
                for f in pf.functions:
                    all_functions.append({"file_id": pf.id, "file_path": pf.path, **asdict(f)})
                parsed_files.append(file_dict)

            elif ext in JS_EXTS:
                file_dict = parse_js_file(dest, p, repo_id)
                if file_dict is None:
                    continue
                file_dict["language"] = js_language_for(ext)
                js_count += 1
                for c in file_dict.get("classes", []):
                    all_classes.append({"file_id": file_dict["id"], "file_path": file_dict["path"], **c})
                for f in file_dict.get("functions", []):
                    all_functions.append({"file_id": file_dict["id"], "file_path": file_dict["path"], **f})
                parsed_files.append(file_dict)

            else:
                # non-code files: counted for language stats, no deep parsing
                parsed_files.append(_stub_file(dest, p, lang_name, repo_id))

        parse_detail_parts: list[str] = [f"{totals['files']:,} files"]
        if py_count:
            parse_detail_parts.append(f"{py_count:,} Python")
        if js_count:
            parse_detail_parts.append(f"{js_count:,} JS/TS")
        registry.stage(job_id, "parse", state="done", detail=" • ".join(parse_detail_parts))

        # ── 3. graph ──────────────────────────────────
        registry.stage(job_id, "graph", state="running", detail="Resolving imports...")

        # Python module index: dotted-name → file path
        python_files = [f for f in parsed_files if f["language"] == "Python"]
        python_module_index = build_module_index(python_files)
        # JS all-files set for path-based resolution
        js_all_paths: set[str] = {
            f["path"] for f in parsed_files
            if f["language"] in ("JavaScript", "TypeScript")
        }
        js_aliases = discover_js_aliases(dest)

        edges: list[dict] = []
        seen_edges: set[tuple[str, str]] = set()
        dependents_by_path: dict[str, set[str]] = defaultdict(set)
        deps_by_path: dict[str, set[str]] = defaultdict(set)

        for f in parsed_files:
            lang = f["language"]
            if lang not in ("Python", "JavaScript", "TypeScript"):
                continue
            for imp in f.get("imports", []):
                if lang == "Python":
                    target = resolve(f["path"], imp["module"], imp.get("level", 0), python_module_index)
                else:
                    target = resolve_js_import(f["path"], imp["module"], js_all_paths, aliases=js_aliases)

                if target and target != f["path"]:
                    key = (f["path"], target)
                    if key in seen_edges:
                        continue
                    seen_edges.add(key)
                    edges.append({"source": f["path"], "target": target, "kind": "import"})
                    dependents_by_path[target].add(f["path"])
                    deps_by_path[f["path"]].add(target)

        # attach dependencies/dependents onto each file
        for f in parsed_files:
            if f["language"] not in ("Python", "JavaScript", "TypeScript"):
                f["dependencies"] = []
                f["dependents"] = []
                continue
            f["dependencies"] = [
                {"id": _find_id(parsed_files, t), "path": t}
                for t in sorted(deps_by_path.get(f["path"], []))
            ]
            f["dependents"] = [
                {"id": _find_id(parsed_files, p), "path": p}
                for p in sorted(dependents_by_path.get(f["path"], []))
            ]

        registry.stage(
            job_id,
            "graph",
            state="done",
            detail=f"{len(parsed_files):,} nodes • {len(edges):,} edges",
        )

        # ── 4. ai (embeddings + summary) ──────────────
        registry.stage(job_id, "ai", state="running", detail="Building embeddings...")
        chunks = build_chunks(parsed_files)
        chunk_count = build_search_index(repo_id, chunks)

        registry.stage(job_id, "ai", state="running",
                       detail=f"Indexed {chunk_count:,} chunk(s); summarizing…")
        owner, name = parse_github_url(repo_url)
        stats = _build_stats(parsed_files, edges, totals, all_classes, all_functions)
        complexity = overall_complexity(
            [f for f in parsed_files if f["language"] in ("Python", "JavaScript", "TypeScript")]
        )
        large = sum(1 for f in parsed_files if f["lines"] >= 500)
        overview = {
            "id": repo_id,
            "name": name,
            "owner": owner,
            "url": repo_url,
            "description": _describe(name, languages),
            "primary_language": languages[0]["name"] if languages else "Unknown",
            "languages": languages,
            "stats": stats,
            "complexity_score": complexity,
            "risk_level": risk_level(complexity, large),
            "recent_activity": _activity(dest),
            "chunk_count": chunk_count,
        }
        overview["ai_summary"] = repo_summary(overview, parsed_files, edges)
        metrics = compute_metrics(parsed_files, edges, languages)
        risks = detect_risks(parsed_files, edges)

        # Prefer the fine-grained risk score/level from the detector.
        overview["risk_score"] = risks["score"]
        overview["risk_level"] = risks["level"]

        blob = {
            "overview": overview,
            "files": parsed_files,
            "edges": edges,
            "metrics": metrics,
            "risks": risks,
        }
        upsert_repo(repo_id, name, owner, repo_url, blob)

        registry.stage(job_id, "ai", state="done", detail="Complete")
        registry.update(job_id, state="complete", progress=1.0)

    except Exception as e:
        registry.update(job_id, state="error", error=str(e))
        job = registry.get(job_id)
        if job:
            for s in job.stages:
                if s.state not in ("done",):
                    registry.stage(job_id, s.id, state="error", detail=str(e))
                    break
        traceback.print_exc()


# ── helpers ───────────────────────────────────────────────────────
def _find_id(files: list[dict], path: str) -> str | None:
    for f in files:
        if f["path"] == path:
            return f["id"]
    return None


def _describe(name: str, languages: list[dict]) -> str:
    if not languages:
        return name
    langs = ", ".join(l["name"] for l in languages[:3])
    return f"{name} — {langs} project analyzed by NeuroScope."


def _stub_file(root, p, lang_name: str, repo_id: str) -> dict:
    """Non-code files get a lightweight record for language stats + UI listing."""
    from utils.hashing import file_id_for
    rel = p.relative_to(root).as_posix()
    try:
        lines = sum(1 for _ in p.open("rb"))
    except OSError:
        lines = 0
    return {
        "id": file_id_for(repo_id, rel),
        "path": rel,
        "name": p.name,
        "language": lang_name,
        "lines": lines,
        "kind": "asset",
        "docstring": None,
        "classes": [],
        "functions": [],
        "imports": [],
        "complexity": 1.0,
        "dependencies": [],
        "dependents": [],
    }


def _build_stats(files, edges, totals, all_classes, all_functions) -> dict:
    py = [f for f in files if f["language"] == "Python"]
    js = [f for f in files if f["language"] in ("JavaScript", "TypeScript")]
    return {
        "files": totals["files"],
        "pythonFiles": len(py),
        "jsFiles": len(js),
        "classes": len(all_classes),
        "functions": len(all_functions),
        "dependencies": len(edges),
        "totalLines": totals["lines"],
        "services": _top_level_dir_count(files),
    }


def _top_level_dir_count(files: list[dict]) -> int:
    tops = set()
    for f in files:
        parts = f["path"].split("/")
        if len(parts) > 1:
            tops.add(parts[0])
    return len(tops) or 1


def _activity(dest) -> list[dict]:
    return recent_commits(dest, limit=10)


# ── public entry point ────────────────────────────────────────────
def start(job_id: str, repo_id: str, repo_url: str) -> None:
    """Fire and forget — spawns a daemon thread that runs the pipeline."""
    threading.Thread(
        target=run_analysis,
        args=(job_id, repo_id, repo_url),
        daemon=True,
        name=f"neuroscope-analyze-{job_id[:6]}",
    ).start()
