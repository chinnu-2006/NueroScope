"""NeuroScope FastAPI entrypoint.

Kept intentionally small — routers live in `api/` and are mounted here.
Run:  uvicorn main:app --reload
"""
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.health import router as health_router
from api.analyze import router as analyze_router
from api.repos import router as repos_router
from api.chat import router as chat_router

# Load .env if present (GEMINI_API_KEY, etc.). Optional.
load_dotenv(Path(__file__).parent / ".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure runtime folders exist so first requests don't 500.
    for sub in ("repos", "cache", "samples"):
        (Path(__file__).parent / sub).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="NeuroScope API",
    version="0.1.0",
    description="AI-powered code intelligence for GitHub repositories.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Router mount points. New routers get added here as phases progress.
app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(repos_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "name": "NeuroScope",
        "version": app.version,
        "docs": "/docs",
    }
