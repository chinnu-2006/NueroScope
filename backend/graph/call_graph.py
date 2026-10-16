"""Function Call Graph view: who calls what, across Python and JS/TS.

Like component_tree.py, this is computed on-demand from source on disk
rather than the persisted analysis blob — cheap enough to redo per
request, and means it works immediately for repos analyzed before this
view existed.

Node granularity is per-function/method (qualified by file), not per-file
— that's the whole point of this view vs. the File Dependency graph.
"""
from __future__ import annotations

from pathlib import Path

from parser.ast_parser import analyze_python_calls, analyze_python_imports
from parser.js_parser import analyze_js_file
from parser.module_resolver import (
    build_module_index,
    discover_js_aliases,
    resolve,
    resolve_js_import,
)


PY = "Python"
JS_LANGS = ("JavaScript", "TypeScript")


def build_call_graph(data: dict, repo_root: Path) -> dict:
    files = data.get("files", [])
    if not files or not repo_root.exists():
        return {"nodes": [], "edges": []}
    by_path = {f["path"]: f for f in files}

    nodes: list[dict] = []
    node_ids: set[str] = set()
    edges: list[dict] = []
    seen_edge: set[tuple[str, str]] = set()

    def ensure_node(file_path: str, qualname: str, is_method: bool, language: str) -> str:
        nid = f"__fn__{file_path}::{qualname}"
        if nid not in node_ids:
            node_ids.add(nid)
            f = by_path[file_path]
            nodes.append({
                "id": nid,
                "path": file_path,
                "name": qualname,
                "kind": "service" if is_method else "utility",
                "lines": 0,
                "complexity": 0,
                "language": language,
                "file_id": f["id"],
            })
        return nid

    def add_edge(src_id: str, tgt_id: str) -> None:
        if src_id == tgt_id:
            return
        key = (src_id, tgt_id)
        if key in seen_edge:
            return
        seen_edge.add(key)
        edges.append({"id": f"{src_id}->{tgt_id}", "source": src_id, "target": tgt_id, "kind": "calls"})

    _build_python(files, by_path, repo_root, ensure_node, add_edge)
    _build_js(files, by_path, repo_root, ensure_node, add_edge)

    return {"nodes": nodes, "edges": edges}


def _build_python(files, by_path, repo_root, ensure_node, add_edge) -> None:
    py_files = [f for f in files if f.get("language") == PY]
    if not py_files:
        return
    py_index = build_module_index(py_files)

    for f in py_files:
        full_path = repo_root / f["path"]
        fn_infos = analyze_python_calls(repo_root, full_path)
        if not fn_infos:
            continue

        local_by_name: dict[str, str] = {}
        local_classes: dict[str, list[str]] = {}
        for info in fn_infos:
            if info["is_method"]:
                local_classes.setdefault(info["class_name"], []).append(info["name"])
            else:
                local_by_name[info["name"]] = info["qualname"]

        import_targets: dict[str, tuple[str, str | None]] = {}
        for b in analyze_python_imports(repo_root, full_path):
            target_file = resolve(f["path"], b["module"], b["level"], py_index)
            if not target_file or target_file not in by_path:
                continue
            import_targets[b["local_name"]] = (target_file, b["orig_name"])

        for info in fn_infos:
            src_id = ensure_node(f["path"], info["qualname"], info["is_method"], PY)
            for raw in info["calls"]:
                target = _resolve_python_call(raw, f["path"], info, local_by_name, local_classes, import_targets)
                if not target:
                    continue
                tgt_path, tgt_qualname = target
                if tgt_path not in by_path:
                    continue
                tgt_id = ensure_node(tgt_path, tgt_qualname, "." in tgt_qualname, by_path[tgt_path]["language"])
                add_edge(src_id, tgt_id)


def _resolve_python_call(raw, source_path, caller_info, local_by_name, local_classes, import_targets):
    parts = raw.split(".")
    head, tail = parts[0], parts[-1]

    if head == "self" and caller_info.get("class_name"):
        cls = caller_info["class_name"]
        if tail in local_classes.get(cls, []):
            return source_path, f"{cls}.{tail}"
        return None

    if len(parts) == 1:
        if head in local_by_name:
            return source_path, local_by_name[head]
        if head in import_targets:
            tgt_file, orig_name = import_targets[head]
            if orig_name:
                return tgt_file, orig_name
        return None

    if head in import_targets:
        tgt_file, _orig_name = import_targets[head]
        return tgt_file, tail
    return None


def _build_js(files, by_path, repo_root, ensure_node, add_edge) -> None:
    js_files = [f for f in files if f.get("language") in JS_LANGS]
    if not js_files:
        return
    js_paths = {f["path"] for f in js_files}
    aliases = discover_js_aliases(repo_root)

    for f in js_files:
        full_path = repo_root / f["path"]
        analysis = analyze_js_file(repo_root, full_path)
        local_names = {d["name"] for d in analysis["definitions"]}

        import_targets: dict[str, str] = {}
        for b in analysis["import_bindings"]:
            target = resolve_js_import(f["path"], b["module"], js_paths, aliases=aliases)
            if not target or target not in by_path:
                continue
            if b.get("default"):
                import_targets[b["default"]] = target
            if b.get("namespace"):
                import_targets[b["namespace"]] = target
            for n in b.get("names", []):
                import_targets[n] = target

        for d in analysis["definitions"]:
            src_id = ensure_node(f["path"], d["name"], False, f["language"])
            for raw in d["call_names"]:
                parts = raw.split(".")
                head, tail = parts[0], parts[-1]
                if head == d["name"]:
                    continue
                if head in local_names:
                    tgt_id = ensure_node(f["path"], head, False, f["language"])
                elif head in import_targets:
                    tgt_path = import_targets[head]
                    tgt_name = tail if len(parts) > 1 else head
                    tgt_id = ensure_node(tgt_path, tgt_name, False, by_path[tgt_path]["language"])
                else:
                    continue
                add_edge(src_id, tgt_id)
