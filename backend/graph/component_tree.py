"""Component Tree view: React/JSX composition (who renders whom) plus
custom-hook usage.

Built on-demand straight from source on disk rather than the persisted
analysis blob — the underlying regex extraction (see parser/js_parser.py)
is intentionally lightweight, so redoing it per request is cheap and
means this works immediately even for repos analyzed before this view
existed.
"""
from __future__ import annotations

from pathlib import Path

from parser.js_parser import analyze_js_file
from parser.module_resolver import discover_js_aliases, resolve_js_import


JS_LANGS = ("JavaScript", "TypeScript")


def _node_kind(name: str) -> str:
    if name.startswith("use") and len(name) > 3 and name[3].isupper():
        return "hook"
    if name[:1].isupper():
        return "component"
    return "utility"


def build_component_tree_graph(data: dict, repo_root: Path) -> dict:
    files = [f for f in data.get("files", []) if f.get("language") in JS_LANGS]
    if not files or not repo_root.exists():
        return {"nodes": [], "edges": []}

    by_path = {f["path"]: f for f in files}
    all_paths = set(by_path)
    aliases = discover_js_aliases(repo_root)

    nodes: list[dict] = []
    node_ids: set[str] = set()
    edges: list[dict] = []
    seen_edge: set[tuple[str, str, str]] = set()

    def ensure_node(file_path: str, name: str) -> str:
        nid = f"__def__{file_path}::{name}"
        if nid not in node_ids:
            node_ids.add(nid)
            f = by_path[file_path]
            nodes.append({
                "id": nid,
                "path": file_path,
                "name": name,
                "kind": _node_kind(name),
                "lines": 0,
                "complexity": 0,
                "language": f["language"],
                "file_id": f["id"],
            })
        return nid

    def add_edge(src_id: str, tgt_id: str, kind: str) -> None:
        if src_id == tgt_id:
            return
        key = (src_id, tgt_id, kind)
        if key in seen_edge:
            return
        seen_edge.add(key)
        edges.append({"id": f"{src_id}->{tgt_id}#{kind}", "source": src_id, "target": tgt_id, "kind": kind})

    for f in files:
        analysis = analyze_js_file(repo_root, repo_root / f["path"])
        local_names = {d["name"] for d in analysis["definitions"]}

        import_targets: dict[str, str] = {}
        for b in analysis["import_bindings"]:
            target = resolve_js_import(f["path"], b["module"], all_paths, aliases=aliases)
            if not target or target not in by_path:
                continue
            if b.get("default"):
                import_targets[b["default"]] = target
            if b.get("namespace"):
                import_targets[b["namespace"]] = target
            for n in b.get("names", []):
                import_targets[n] = target

        for d in analysis["definitions"]:
            is_component = d["name"][:1].isupper()
            is_hook_def = d["name"].startswith("use")
            if not (is_component or is_hook_def):
                continue
            src_id = ensure_node(f["path"], d["name"])

            for tag in d["jsx_tags"]:
                if tag == d["name"]:
                    continue
                if tag in local_names:
                    add_edge(src_id, ensure_node(f["path"], tag), "renders")
                elif tag in import_targets:
                    add_edge(src_id, ensure_node(import_targets[tag], tag), "renders")

            for hook in d["hook_calls"]:
                if hook == d["name"]:
                    continue
                if hook in local_names:
                    add_edge(src_id, ensure_node(f["path"], hook), "uses_hook")
                elif hook in import_targets:
                    add_edge(src_id, ensure_node(import_targets[hook], hook), "uses_hook")
                # else: built-in hook (useState, useEffect, ...) — no local node to point at.

    return {"nodes": nodes, "edges": edges}
