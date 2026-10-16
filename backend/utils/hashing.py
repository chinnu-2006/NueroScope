"""Deterministic short IDs from repo URLs / file paths."""
import hashlib
import re

_GITHUB_RE = re.compile(
    r"^https://github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?$"
)


def parse_github_url(url: str) -> tuple[str, str]:
    """Return (owner, repo) or raise ValueError."""
    m = _GITHUB_RE.match(url.strip())
    if not m:
        raise ValueError("Only public https://github.com/<owner>/<repo> URLs are accepted.")
    return m.group(1), m.group(2)


def repo_id_for(url: str) -> str:
    """`owner__repo__<sha8>` — stable across runs, filesystem-safe."""
    owner, repo = parse_github_url(url)
    digest = hashlib.sha256(url.encode()).hexdigest()[:8]
    safe = f"{owner}__{repo}__{digest}"
    return re.sub(r"[^A-Za-z0-9_.-]", "_", safe)


def file_id_for(repo_id: str, rel_path: str) -> str:
    return hashlib.sha1(f"{repo_id}::{rel_path}".encode()).hexdigest()[:16]


def job_id() -> str:
    """Short random-ish job id."""
    import secrets
    return secrets.token_urlsafe(9)
