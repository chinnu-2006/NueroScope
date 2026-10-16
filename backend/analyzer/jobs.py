"""In-memory job registry with per-job progress state.

Single-user, single-process app — a plain dict + Lock is enough. If we ever
need cross-process, swap the backing store; the interface stays the same.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field, asdict


_STAGES = [
    ("clone", "Cloning repository"),
    ("parse", "Parsing source"),
    ("graph", "Building graph"),
    ("ai", "AI analysis"),
]


@dataclass
class Stage:
    id: str
    label: str
    detail: str = ""
    state: str = "pending"     # pending | running | done | error


@dataclass
class Job:
    job_id: str
    repo_id: str
    repo_url: str
    state: str = "queued"      # queued | running | complete | error
    progress: float = 0.0
    error: str | None = None
    stages: list[Stage] = field(default_factory=lambda: [Stage(i, l) for i, l in _STAGES])

    def stage(self, sid: str) -> Stage:
        return next(s for s in self.stages if s.id == sid)


class JobRegistry:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, job_id: str, repo_id: str, repo_url: str) -> Job:
        with self._lock:
            job = Job(job_id=job_id, repo_id=repo_id, repo_url=repo_url)
            self._jobs[job_id] = job
            return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **fields) -> None:
        with self._lock:
            j = self._jobs.get(job_id)
            if not j:
                return
            for k, v in fields.items():
                setattr(j, k, v)

    def stage(self, job_id: str, stage_id: str, *, state: str, detail: str = "") -> None:
        with self._lock:
            j = self._jobs.get(job_id)
            if not j:
                return
            s = j.stage(stage_id)
            s.state = state
            if detail:
                s.detail = detail
            # progress = count of done stages / total
            done = sum(1 for st in j.stages if st.state == "done")
            j.progress = round(done / len(j.stages), 2)

    def to_dict(self, job_id: str) -> dict | None:
        j = self.get(job_id)
        if not j:
            return None
        return asdict(j)


registry = JobRegistry()
