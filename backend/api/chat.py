"""Chat + semantic search endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ai import chat as chat_service
from ai import gemini
from models.db import get_repo
from search import index as search_index


router = APIRouter(prefix="/repos", tags=["ai"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(6, ge=1, le=20)


class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    level: str = "intermediate"


@router.post("/{repo_id}/search")
def semantic_search(repo_id: str, req: SearchRequest) -> dict:
    if get_repo(repo_id) is None:
        raise HTTPException(404, "Unknown repo_id")
    hits = search_index.query(repo_id, req.query, k=req.top_k)
    return {"query": req.query, "hits": hits}


@router.post("/{repo_id}/chat")
def chat(repo_id: str, req: ChatRequest) -> dict:
    if get_repo(repo_id) is None:
        raise HTTPException(404, "Unknown repo_id")
    return chat_service.answer(repo_id, req.query, req.level)


@router.get("/{repo_id}/ai/status")
def ai_status(repo_id: str) -> dict:
    """Reports whether Gemini is configured, whether the FAISS index is on
    disk, and whether we could rebuild it lazily from the stored blob.

    `chunkable=False` is the tell that the repo was analyzed before the
    deep JS/TS parser landed — the user should re-analyze to enable AI.
    """
    repo = get_repo(repo_id)
    if repo is None:
        raise HTTPException(404, "Unknown repo_id")
    index_ready = search_index.load(repo_id) is not None
    # Cheap heuristic: any file with imports/functions/classes is chunkable.
    chunkable = any(
        f.get("imports") or f.get("functions") or f.get("classes")
        for f in repo["data"].get("files", [])
    )
    return {
        "provider": "gemini" if gemini.is_available() else "mock",
        "index_ready": index_ready,
        "chunkable": chunkable,
    }
