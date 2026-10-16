"""POST /analyze — kick off a background analysis job.
   GET  /analyze/{job_id}/status — poll job progress.
"""
from fastapi import APIRouter, HTTPException

from analyzer import pipeline
from analyzer.jobs import registry
from models.schemas import AnalyzeRequest, AnalyzeStarted, JobStatus
from utils.hashing import job_id as new_job_id, parse_github_url, repo_id_for


router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeStarted)
def analyze(req: AnalyzeRequest) -> AnalyzeStarted:
    try:
        parse_github_url(req.repo_url)  # validates
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo_id = repo_id_for(req.repo_url)
    jid = new_job_id()
    registry.create(jid, repo_id, req.repo_url)
    pipeline.start(jid, repo_id, req.repo_url)
    return AnalyzeStarted(repo_id=repo_id, job_id=jid)


@router.get("/{job_id}/status", response_model=JobStatus)
def status(job_id: str) -> JobStatus:
    payload = registry.to_dict(job_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Unknown job_id")
    return JobStatus(**payload)
