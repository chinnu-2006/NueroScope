"""Map imports → repo-local file paths so we can build dependency edges.

Python resolver notes
─────────────────────
The old resolver used the raw file path as the dotted module name:

    airflow-core/src/airflow/models/dag.py  →  airflow-core.src.airflow.models.dag

This fails for every modern `src/`-layout monorepo (Airflow, Poetry projects,
Hatch projects, etc.), because the code actually imports as `airflow.models.dag`.
This rewrite detects **package roots** — the directory from which the dotted
module name starts — and indexes files by their *canonical* module name.

Package-root detection uses two signals, deepest-wins:

  1. `__init__.py` chain (PEP 328). Walk up from every ``__init__.py`` until
     the parent directory is no longer a package. The parent is a root.
  2. ``src/`` / ``lib/`` convention (common for src-layouts). Any file that
     lives under ``<x>/src/…`` implies ``<x>/src`` is a root — this catches
     namespace packages that don't ship an ``__init__.py`` (PEP 420) *and*
     namespace-merged packages like ``airflow.providers``.

Each file also keeps a raw-path alias so old-style layouts still resolve.

Relative imports use each file's **canonical** module name (not its raw path)
so ``from ..foo import bar`` walks the semantic package tree, not the disk
directory tree.
"""
from __future__ import annotations

import json
import posixpath
import re
from pathlib import Path


STDLIB = {
    "abc", "argparse", "ast", "asyncio", "base64", "binascii", "bisect", "builtins",
    "bz2", "calendar", "cmath", "cmd", "codecs", "collections", "concurrent", "configparser",
    "contextlib", "contextvars", "copy", "copyreg", "csv", "ctypes", "dataclasses", "datetime",
    "decimal", "difflib", "dis", "email", "encodings", "enum", "errno", "faulthandler",
    "fcntl", "filecmp", "fileinput", "fnmatch", "fractions", "ftplib", "functools", "gc",
    "genericpath", "getopt", "getpass", "gettext", "glob", "gzip", "hashlib", "heapq", "hmac",
    "html", "http", "imaplib", "importlib", "inspect", "io", "ipaddress", "itertools", "json",
    "keyword", "linecache", "locale", "logging", "lzma", "mailbox", "math", "mimetypes",
    "mmap", "multiprocessing", "netrc", "nis", "nntplib", "ntpath", "numbers", "opcode",
    "operator", "optparse", "os", "pathlib", "pickle", "pickletools", "pkgutil", "platform",
    "plistlib", "poplib", "posix", "posixpath", "pprint", "profile", "pstats", "pty", "pwd",
    "py_compile", "pyclbr", "pydoc", "queue", "quopri", "random", "re", "readline", "reprlib",
    "resource", "rlcompleter", "runpy", "sched", "secrets", "select", "selectors", "shelve",
    "shlex", "shutil", "signal", "site", "smtplib", "socket", "socketserver", "sqlite3",
    "ssl", "stat", "statistics", "string", "stringprep", "struct", "subprocess", "sunau",
    "symtable", "sys", "sysconfig", "syslog", "tabnanny", "tarfile", "telnetlib", "tempfile",
    "termios", "textwrap", "threading", "time", "timeit", "token", "tokenize", "trace",
    "traceback", "tracemalloc", "tty", "types", "typing", "typing_extensions", "unicodedata",
    "unittest", "urllib", "uu", "uuid", "venv", "warnings", "wave", "weakref", "webbrowser",
    "wsgiref", "xdrlib", "xml", "xmlrpc", "zipapp", "zipfile", "zipimport", "zlib", "zoneinfo",
    "__future__", "__main__",
}


# ── Package-root detection ────────────────────────────────────────────
_ROOT_HINT_DIRS = ("src", "lib", "sources", "python")


def _find_package_roots(files: list[dict]) -> list[str]:
    """Return package-root paths sorted deepest first.

    A package root is a directory whose *immediate children* are the top-level
    Python packages of the repo — i.e. where dotted module names start counting.
    """
    # 1. Directories that contain an __init__.py.
    init_dirs: set[str] = set()
    for f in files:
        p = f.get("path", "")
        if not (p.endswith("/__init__.py") or p == "__init__.py"):
            continue
        parent = "/".join(p.split("/")[:-1])  # "" for repo-root __init__.py
        init_dirs.add(parent)

    # 2. From every __init__.py-bearing directory, walk up the chain of
    #    __init__.py-bearing parents. The first non-__init__ parent is a root.
    roots: set[str] = set()
    for d in init_dirs:
        cur = d
        while True:
            parent = "/".join(cur.split("/")[:-1]) if "/" in cur else ""
            if parent in init_dirs:
                cur = parent
                continue
            roots.add(parent)
            break

    # 3. Src-layout heuristic: any file below `<x>/src/…` implies `<x>/src`
    #    is a root, even without an __init__.py (namespace packages).
    for f in files:
        p = f.get("path", "")
        if not p.endswith(".py"):
            continue
        parts = p.split("/")
        for i, seg in enumerate(parts[:-1]):
            if seg in _ROOT_HINT_DIRS:
                roots.add("/".join(parts[: i + 1]))

    # Repo-root as a last-resort root so we always have SOMETHING to match.
    roots.add("")

    # Deepest first — most specific match wins in _canonical_module.
    return sorted(roots, key=lambda r: (-len(r), r))


def _canonical_module(rel_path: str, roots_deepest_first: list[str]) -> str | None:
    """Return the canonical dotted module name for ``rel_path``.

    Prefers the deepest matching package root. Falls back to raw path.
    """
    if not rel_path.endswith(".py"):
        return None

    for root in roots_deepest_first:
        prefix = root + "/" if root else ""
        if root == "" or rel_path.startswith(prefix):
            tail = rel_path[len(prefix):]
            if tail == "__init__.py":
                return ""  # root package itself has no dotted name
            if tail.endswith("/__init__.py"):
                tail = tail[: -len("/__init__.py")]
            elif tail.endswith(".py"):
                tail = tail[:-3]
            if not tail:
                return None
            return tail.replace("/", ".")

    return None


def build_module_index(files: list[dict]) -> tuple[dict[str, str], dict[str, str]]:
    """Build the Python module index.

    Returns ``(name_to_path, path_to_name)`` where:
      * ``name_to_path`` maps dotted module name → repo-relative file path.
      * ``path_to_name`` maps repo-relative file path → its canonical
        dotted name (used by ``resolve`` when walking up for relative imports).

    Files can be reachable under multiple dotted names (canonical + raw-path
    alias). Canonical wins in the primary map; aliases only fill gaps.
    """
    roots = _find_package_roots(files)

    name_to_path: dict[str, str] = {}
    path_to_name: dict[str, str] = {}

    # ── First pass: canonical (package-root-based) names ─────────────
    for f in files:
        rel = f.get("path", "")
        if not rel.endswith(".py"):
            continue
        mod = _canonical_module(rel, roots)
        if mod is None:
            continue
        path_to_name[rel] = mod
        if mod and mod not in name_to_path:
            name_to_path[mod] = rel

    # ── Second pass: raw-path alias (backward compatibility) ─────────
    for f in files:
        rel = f.get("path", "")
        if not rel.endswith(".py"):
            continue
        parts = rel[:-3].split("/")
        if parts and parts[-1] == "__init__":
            parts = parts[:-1]
        raw = ".".join(parts)
        if raw and raw not in name_to_path:
            name_to_path[raw] = rel

    return name_to_path, path_to_name


# ── Resolution ────────────────────────────────────────────────────────
def _walk_up(target: str, index: dict[str, str]) -> str | None:
    """Return a matching entry from `index` for `target`, walking prefixes."""
    if not target:
        return None
    if target in index:
        return index[target]
    while "." in target:
        target = target.rsplit(".", 1)[0]
        if target in index:
            return index[target]
    return None


def resolve(
    source_file: str,
    imp_module: str,
    imp_level: int,
    index,
) -> str | None:
    """Return the repo-local file path an import points at, or None.

    ``index`` accepts either the new ``(name_to_path, path_to_name)`` tuple
    (from ``build_module_index``) or a legacy plain dict.
    """
    if isinstance(index, tuple):
        name_to_path, path_to_name = index
    else:  # legacy dict — no path→name mapping available
        name_to_path, path_to_name = index, {}

    if imp_level > 0:
        # Relative import — anchor on the source file's canonical module name
        # if we know it, otherwise fall back to raw-path dot names.
        source_mod = path_to_name.get(source_file)
        if source_mod is None:
            parts = source_file[:-len(".py")].split("/") if source_file.endswith(".py") else source_file.split("/")
            if parts and parts[-1] == "__init__":
                parts = parts[:-1]
            source_mod = ".".join(parts)

        parts = source_mod.split(".") if source_mod else []
        # A file that IS __init__.py already represents its own package;
        # otherwise the enclosing package is parts[:-1].
        is_init = source_file.endswith("/__init__.py") or source_file == "__init__.py"
        pkg_parts = parts if is_init else parts[:-1]

        # `from . import x` → level=1, no walk-up beyond current package.
        # `from ..x` → level=2, walk up one more level. In general: walk up (level-1).
        if imp_level > 1:
            steps_up = imp_level - 1
            pkg_parts = pkg_parts[:-steps_up] if steps_up <= len(pkg_parts) else []

        segs = pkg_parts + ([imp_module] if imp_module else [])
        target = ".".join(seg for seg in segs if seg)
    else:
        # Absolute import — cheap stdlib filter first.
        top = (imp_module or "").split(".")[0]
        if not top:
            return None
        if top in STDLIB:
            return None
        target = imp_module

    return _walk_up(target, name_to_path)


# ── JS / TS module resolution (unchanged) ─────────────────────────────
_JS_EXTS = ("", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
_INDEX_STEMS = ("/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/index.mjs")


def _normalize_posix(parts_iterable) -> str:
    parts: list[str] = []
    for p in parts_iterable:
        if p == "." or p == "":
            continue
        if p == "..":
            if parts:
                parts.pop()
            continue
        parts.append(p)
    return "/".join(parts)


def _load_json_lenient(path: Path) -> dict | None:
    """tsconfig.json allows comments + trailing commas — strip those before
    parsing since Python's json module doesn't tolerate either."""
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"(^|\s)//[^\n]*", r"\1", text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def discover_js_aliases(repo_root: Path) -> dict[str, str]:
    """Best-effort `@/foo` → `frontend/src/foo`-style alias map, read from
    every `tsconfig*.json`'s `compilerOptions.paths`. Without this, any
    repo using path aliases (extremely common in Vite/Next/CRA projects)
    silently loses every aliased import edge — `resolve_js_import` only
    ever sees relative (`./x`) or bare-package (`lodash`) specifiers.
    """
    aliases: dict[str, str] = {}
    if not repo_root.exists():
        return aliases

    for tsconfig_path in repo_root.rglob("tsconfig*.json"):
        if "node_modules" in tsconfig_path.parts:
            continue
        data = _load_json_lenient(tsconfig_path)
        if not data:
            continue
        compiler_opts = data.get("compilerOptions") or {}
        paths = compiler_opts.get("paths") or {}
        if not paths:
            continue

        base_dir = tsconfig_path.parent.relative_to(repo_root).as_posix()
        if base_dir == ".":
            base_dir = ""
        base_url = compiler_opts.get("baseUrl", ".")

        for alias_pattern, targets in paths.items():
            if not targets:
                continue
            alias_key = alias_pattern.rstrip("/*")
            target_rel = str(targets[0]).rstrip("/*")
            combined = "/".join(p for p in (base_dir, base_url, target_rel) if p and p != ".")
            normalized = posixpath.normpath(combined) if combined else ""
            if normalized == ".":
                normalized = ""
            aliases[alias_key] = normalized

    return aliases


def resolve_js_import(
    source_file: str,
    import_path: str,
    all_files,
    aliases: dict[str, str] | None = None,
) -> str | None:
    """Resolve a JS/TS import to a repo-local file path, if it exists."""
    if not import_path:
        return None

    if aliases:
        for alias_key, alias_target in aliases.items():
            if import_path == alias_key or import_path.startswith(alias_key + "/"):
                remainder = import_path[len(alias_key):].lstrip("/")
                import_path = f"{alias_target}/{remainder}" if remainder else alias_target
                break

    is_relative = import_path.startswith(".")
    is_absolute_root = import_path.startswith("/")

    if not (is_relative or is_absolute_root):
        target_base = import_path.lstrip("/")
        for ext in _JS_EXTS:
            candidate = target_base + ext
            if candidate in all_files:
                return candidate
        for stem in _INDEX_STEMS:
            candidate = target_base + stem
            if candidate in all_files:
                return candidate
        return None

    if is_relative:
        source_dir_parts = source_file.split("/")[:-1]
        combined = source_dir_parts + import_path.split("/")
        target_base = _normalize_posix(combined)
    else:
        target_base = import_path.lstrip("/")

    if not target_base:
        return None

    for ext in _JS_EXTS:
        candidate = target_base + ext
        if candidate in all_files:
            return candidate
    for stem in _INDEX_STEMS:
        candidate = target_base + stem
        if candidate in all_files:
            return candidate
    return None
