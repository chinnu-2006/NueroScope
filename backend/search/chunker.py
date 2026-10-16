"""Turn parsed files into embed-worthy text chunks.

Each chunk has:
  - a `text` field (what gets embedded)
  - an `extract` field (human-readable summary for UI display)
  - metadata: file_id, file_path, chunk_type, name (function/class name)

Types:
  file      one per file — path + docstring + name summary
  class     one per class — bases, docstring, methods
  function  one per function — signature + docstring + complexity
"""
from __future__ import annotations

from typing import Iterable


def _shorten(text: str | None, max_len: int = 200) -> str:
    if not text:
        return ""
    t = text.strip().replace("\n", " ")
    if len(t) > max_len:
        t = t[: max_len - 1] + "…"
    return t


def chunks_for_file(file: dict) -> list[dict]:
    """Return every chunk for a single parsed file."""
    out: list[dict] = []
    fid = file["id"]
    fpath = file["path"]
    lang = file.get("language", "")
    kind = file.get("kind", "module")
    file_doc = _shorten(file.get("docstring"), 400)

    # File-level chunk
    fn_names = [f["name"] for f in file.get("functions", [])[:8]]
    cls_names = [c["name"] for c in file.get("classes", [])[:8]]
    parts = [f"File {fpath}", f"Language: {lang}", f"Kind: {kind}"]
    if file_doc:
        parts.append(file_doc)
    if fn_names:
        parts.append("Functions: " + ", ".join(fn_names))
    if cls_names:
        parts.append("Classes: " + ", ".join(cls_names))
    file_text = "\n".join(parts)
    extract = file_doc or (f"{kind.capitalize()} in {lang}"
                            f" with {len(file.get('functions', []))} function(s), "
                            f"{len(file.get('classes', []))} class(es).")
    out.append({
        "file_id": fid,
        "file_path": fpath,
        "chunk_type": "file",
        "name": file["name"],
        "text": file_text,
        "extract": _shorten(extract, 160),
    })

    # Class chunks
    for c in file.get("classes", []):
        cname = c.get("name", "<class>")
        bases = c.get("bases", []) or []
        doc = _shorten(c.get("docstring"), 400)
        methods = c.get("methods", []) or []
        parts = [f"Class {cname}", f"in {fpath}"]
        if bases:
            parts.append("Inherits: " + ", ".join(bases))
        if doc:
            parts.append(doc)
        if methods:
            parts.append("Methods: " + ", ".join(methods[:12]))
        extract = doc or f"Class `{cname}`" + (f" ({', '.join(methods[:4])}…)" if methods else "")
        out.append({
            "file_id": fid,
            "file_path": fpath,
            "chunk_type": "class",
            "name": cname,
            "text": "\n".join(parts),
            "extract": _shorten(extract, 160),
        })

    # Function chunks
    for fn in file.get("functions", []):
        fname = fn.get("name", "<fn>")
        args = fn.get("args", []) or []
        doc = _shorten(fn.get("docstring"), 400)
        cx = fn.get("complexity", 1)
        parts = [f"Function {fname}({', '.join(args)})", f"in {fpath}"]
        if doc:
            parts.append(doc)
        parts.append(f"Cyclomatic complexity: {cx}")
        extract = doc or f"Function `{fname}({', '.join(args[:3])})`"
        out.append({
            "file_id": fid,
            "file_path": fpath,
            "chunk_type": "function",
            "name": fname,
            "text": "\n".join(parts),
            "extract": _shorten(extract, 160),
        })

    return out


def build_chunks(files: Iterable[dict]) -> list[dict]:
    all_chunks: list[dict] = []
    for f in files:
        # Only chunk deeply-parsed source files.
        if f.get("language") in ("Python", "JavaScript", "TypeScript"):
            all_chunks.extend(chunks_for_file(f))
    return all_chunks
