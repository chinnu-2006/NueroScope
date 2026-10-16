"""Liveness + build-info endpoint."""
import os
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": "neuroscope-api",
        "ai_provider": "gemini" if os.getenv("GEMINI_API_KEY") else "mock",
    }
