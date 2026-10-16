"""Graph builders per view mode: file / folder / module.

Consumes the persisted analysis blob (files, edges) and returns the
`{nodes, edges}` shape the frontend feeds into React Flow.
"""
from __future__ import annotations

from collections import Counter


# ── FILE VIEW ─────────────────────────────────────────────────────────
def build_file_graph(data: dict) -> dict:
    """Direct file-to-file import graph, path-keys translated to node IDs."""
    files = data["files"]
    path_to_id = {f["path"]: f["id"] for f in files}
    nodes = [
        {
            "id": f["id"],
            "path": f["path"],
            "name": f["name"],
            "kind": f.get("kind", "module"),
            "lines": f["lines"],
            "complexity": f["complexity"],
            "language": f["language"],
        }
        for f in files
    ]
    edges: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for e in data.get("edges", []):
        src = path_to_id.get(e["source"])
        tgt = path_to_id.get(e["target"])
        if not (src and tgt):
            continue
        key = (src, tgt)
        if key in seen:
            continue
        seen.add(key)
        edges.append(
            {"id": f"{src}->{tgt}", "source": src, "target": tgt, "kind": e.get("kind", "import")}
        )
    return {"nodes": nodes, "edges": edges}


# ── FOLDER VIEW ───────────────────────────────────────────────────────
def build_folder_graph(data: dict) -> dict:
    """Hierarchy graph: folder → sub-folder → file. `contains` edges only."""
    files = data["files"]
    folders: set[str] = set()
    for f in files:
        parts = f["path"].split("/")
        for i in range(1, len(parts)):
            folders.add("/".join(parts[:i]))

    nodes: list[dict] = []

    # Root sentinel — every top-level folder/file hangs off this.
    nodes.append({
        "id": "__folder__",
        "path": "",
        "name": "/",
        "kind": "folder_root",
        "lines": 0,
        "complexity": 0,
        "language": "Folder",
    })

    for folder in sorted(folders):
        nodes.append({
            "id": f"__folder__{folder}",
            "path": folder,
            "name": folder.split("/")[-1],
            "kind": "folder",
            "lines": 0,
            "complexity": 0,
            "language": "Folder",
        })

    for f in files:
        nodes.append({
            "id": f["id"],
            "path": f["path"],
            "name": f["name"],
            "kind": f.get("kind", "module"),
            "lines": f["lines"],
            "complexity": f["complexity"],
            "language": f["language"],
        })

    edges: list[dict] = []
    seen: set[str] = set()

    def add_edge(src_id: str, tgt_id: str):
        eid = f"{src_id}->{tgt_id}"
        if eid in seen:
            return
        seen.add(eid)
        edges.append({"id": eid, "source": src_id, "target": tgt_id, "kind": "contains"})

    # Folder → sub-folder
    for folder in folders:
        parts = folder.split("/")
        parent_id = "__folder__" if len(parts) == 1 else f"__folder__{'/'.join(parts[:-1])}"
        add_edge(parent_id, f"__folder__{folder}")

    # Folder → file (or root → file for root-level files)
    for f in files:
        parts = f["path"].split("/")
        parent_id = "__folder__" if len(parts) == 1 else f"__folder__{'/'.join(parts[:-1])}"
        add_edge(parent_id, f["id"])

    return {"nodes": nodes, "edges": edges}


# ── MODULE VIEW ───────────────────────────────────────────────────────
def _module_key(path: str, depth: int = 2) -> str:
    """Compress a file path to its owning module: first `depth` path parts."""
    parts = path.split("/")
    if len(parts) <= 1:
        return "(root)"
    take = min(depth, len(parts) - 1)
    return "/".join(parts[:take])


def build_module_graph(data: dict) -> dict:
    """High-level architecture: files grouped into modules by directory."""
    files = data["files"]
    # Sensible default: group by top 2 directory levels
    modules: dict[str, dict] = {}
    for f in files:
        m = _module_key(f["path"])
        info = modules.setdefault(
            m,
            {
                "files": 0,
                "lines": 0,
                "languages": Counter(),
                "kinds": Counter(),
                "complexity_sum": 0.0,
            },
        )
        info["files"] += 1
        info["lines"] += f["lines"]
        info["languages"][f["language"]] += 1
        info["kinds"][f.get("kind", "module")] += 1
        info["complexity_sum"] += f["complexity"] or 0

    nodes: list[dict] = []
    for name, info in modules.items():
        dom_lang = info["languages"].most_common(1)[0][0] if info["languages"] else "Unknown"
        dom_kind = _module_kind(name, info["kinds"])
        nodes.append({
            "id": f"__module__{name}",
            "path": name,
            "name": _prettify_module_name(name),
            "kind": dom_kind,
            "lines": info["lines"],
            "complexity": round(info["complexity_sum"] / max(1, info["files"]), 2),
            "language": dom_lang,
            "file_count": info["files"],
            "dominant_kind": dom_kind,
        })

    # Aggregate cross-module edges from the file-level edges
    counts: Counter[tuple[str, str]] = Counter()
    for e in data.get("edges", []):
        src_m = _module_key(e["source"])
        tgt_m = _module_key(e["target"])
        if src_m != tgt_m:
            counts[(src_m, tgt_m)] += 1

    edges: list[dict] = []
    for (src, tgt), weight in counts.items():
        edges.append({
            "id": f"__module__{src}->__module__{tgt}",
            "source": f"__module__{src}",
            "target": f"__module__{tgt}",
            "kind": "aggregated",
            "weight": weight,
        })

    return {"nodes": nodes, "edges": edges}


def _module_kind(name: str, kinds: Counter) -> str:
    """Best-guess visual bucket for a module node."""
    lo = name.lower()
    if lo in ("frontend", "client", "web") or "/frontend" in lo or "/client" in lo:
        return "frontend"
    if lo in ("backend", "server") or "/backend" in lo or "/server" in lo:
        return "module_group"
    if lo in ("api", "routes") or lo.endswith("/api") or lo.endswith("/routes"):
        return "api"
    if lo in ("services",) or lo.endswith("/services"):
        return "service"
    if lo in ("models", "db", "database") or lo.endswith("/models") or lo.endswith("/db"):
        return "db"
    if lo in ("utils", "lib", "helpers") or lo.endswith("/utils") or lo.endswith("/lib"):
        return "utility"
    if lo in ("tests", "test", "__tests__") or "/tests" in lo or "/test" in lo:
        return "test"
    if lo in ("docs",) or lo.endswith("/docs"):
        return "docs"
    # Fall back to the most common kind found among member files.
    if kinds:
        return kinds.most_common(1)[0][0]
    return "module_group"


def _prettify_module_name(name: str) -> str:
    """Keep the full path as the label — two different `src/` folders under
    `frontend/` and `backend/` need to remain distinguishable."""
    if name == "(root)":
        return "(root)"
    return name
