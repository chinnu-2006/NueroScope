"""Aggregate metric datasets for the Charts + Overview pages."""
from __future__ import annotations

from collections import Counter, defaultdict


def compute(files: list[dict], edges: list[dict], languages: list[dict]) -> dict:
    # Largest files
    largest = sorted(files, key=lambda f: f["lines"], reverse=True)[:10]
    largest_out = [{"path": f["path"], "lines": f["lines"]} for f in largest]

    # Complexity buckets
    buckets = {"1-3": 0, "4-6": 0, "7-10": 0, "11+": 0}
    for f in files:
        c = f["complexity"]
        if c <= 3:
            buckets["1-3"] += 1
        elif c <= 6:
            buckets["4-6"] += 1
        elif c <= 10:
            buckets["7-10"] += 1
        else:
            buckets["11+"] += 1
    complexity_hist = [{"bucket": k, "count": v} for k, v in buckets.items()]

    # Most-connected files (fan-in + fan-out)
    conn: Counter[str] = Counter()
    for e in edges:
        conn[e["source"]] += 1
        conn[e["target"]] += 1
    connected = [
        {"path": p, "connections": c} for p, c in conn.most_common(10)
    ]

    # Files per top-level directory
    dir_counts: dict[str, int] = defaultdict(int)
    for f in files:
        parts = f["path"].split("/")
        top = parts[0] if len(parts) > 1 else "(root)"
        dir_counts[top] += 1
    file_dist = sorted(
        [{"dir": k, "count": v} for k, v in dir_counts.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:10]

    return {
        "languages": languages,
        "largest_files": largest_out,
        "complexity_histogram": complexity_hist,
        "most_connected": connected,
        "file_distribution": file_dist,
    }


def overall_complexity(files: list[dict]) -> float:
    """0-10 score. Median-of-file average complexity, clamped."""
    if not files:
        return 0.0
    scores = sorted(f["complexity"] for f in files)
    median = scores[len(scores) // 2]
    # Map: complexity 1 → 2.0, 5 → 6.0, 15 → 10.0
    score = min(10.0, 1.5 + median * 0.9)
    return round(score, 1)


def risk_level(complexity: float, large_file_count: int) -> str:
    if complexity >= 8 or large_file_count >= 8:
        return "high"
    if complexity >= 5 or large_file_count >= 3:
        return "moderate"
    return "low"
