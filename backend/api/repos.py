"""Read endpoints — served from the SQLite blob written by the pipeline."""
from fastapi import APIRouter, HTTPException, Query

from analyzer.mock_ai import file_explanation
from graph.builders import build_file_graph, build_folder_graph, build_module_graph
from graph.call_graph import build_call_graph
from graph.component_tree import build_component_tree_graph
from models.db import get_repo, list_repos
from utils.paths import repo_path


router = APIRouter(prefix="/repos", tags=["repos"])


@router.get("")
def index() -> list[dict]:
    return list_repos()


@router.get("/{repo_id}")
def overview(repo_id: str) -> dict:
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    return repo["data"]["overview"]


@router.get("/{repo_id}/graph")
def graph(
    repo_id: str,
    mode: str = Query("file", pattern="^(file|folder|module|tree|callgraph)$"),
) -> dict:
    """
    Graph view selector.
      mode=file       → file-to-file import graph (default; the "workhorse" view)
      mode=folder     → hierarchical folder → sub-folder → file tree
      mode=module     → high-level architecture, files grouped by module
      mode=tree       → React component composition + custom-hook usage
      mode=callgraph  → function/method-level call graph (Python + JS/TS)
    """
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    d = repo["data"]
    if mode == "folder":
        return build_folder_graph(d)
    if mode == "module":
        return build_module_graph(d)
    if mode == "tree":
        return build_component_tree_graph(d, repo_path(repo_id))
    if mode == "callgraph":
        return build_call_graph(d, repo_path(repo_id))
    return build_file_graph(d)


@router.get("/{repo_id}/metrics")
def metrics(repo_id: str) -> dict:
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    return repo["data"]["metrics"]


@router.get("/{repo_id}/risks")
def risks(repo_id: str) -> dict:
    """Risk report — computed at analysis time and served from the blob.

    Older analyses (pre-Phase-5) won't have `risks` in the blob; recompute
    lazily from files+edges so the frontend never sees an empty response.
    """
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    data = repo["data"]
    if "risks" in data:
        return data["risks"]
    from analyzer.risk import detect as detect_risks
    return detect_risks(data.get("files", []), data.get("edges", []))


@router.get("/{repo_id}/files/{file_id}")
def file_detail(repo_id: str, file_id: str, level: str = "intermediate") -> dict:
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    for f in repo["data"]["files"]:
        if f["id"] == file_id:
            payload = dict(f)
            payload["ai_explanation"] = file_explanation(f, level=level)
            return payload
    raise HTTPException(404, "Unknown file_id")
