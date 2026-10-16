"""Pydantic response schemas — the shape the SPA sees."""
from typing import Optional
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    repo_url: str


class AnalyzeStarted(BaseModel):
    repo_id: str
    job_id: str


class JobStage(BaseModel):
    id: str            # "clone" | "parse" | "graph" | "ai"
    label: str
    detail: str = ""
    state: str = "pending"  # pending | running | done | error


class JobStatus(BaseModel):
    job_id: str
    repo_id: str
    state: str          # queued | running | complete | error
    progress: float     # 0.0 → 1.0
    stages: list[JobStage]
    error: Optional[str] = None


class LanguageStat(BaseModel):
    name: str
    share: float        # percent 0-100
    files: int
    lines: int
    color: str


class RepoOverview(BaseModel):
    id: str
    name: str
    owner: str
    url: str
    description: str
    primary_language: str
    languages: list[LanguageStat]
    stats: dict
    complexity_score: float
    risk_level: str
    ai_summary: str
    recent_activity: list[dict]


class FunctionInfo(BaseModel):
    name: str
    args: list[str]
    lineno: int
    complexity: int
    docstring: Optional[str] = None
    is_method: bool = False


class ClassInfo(BaseModel):
    name: str
    bases: list[str]
    lineno: int
    docstring: Optional[str] = None
    methods: list[str]


class FileDetail(BaseModel):
    id: str
    path: str
    name: str
    language: str
    lines: int
    complexity: float
    kind: str
    docstring: Optional[str] = None
    imports: list[str]
    dependencies: list[dict]   # [{id, path}]
    dependents: list[dict]
    classes: list[ClassInfo]
    functions: list[FunctionInfo]
    ai_explanation: Optional[str] = None
