"""JavaScript / TypeScript / JSX / TSX import + definition extractor.

Regex-based, not a full AST — but robust enough for the ~95% of real code
we care about. Handles the common shapes:

    import X from 'path'
    import { X, Y } from 'path'
    import * as X from 'path'
    import X, { Y } from 'path'
    import 'path'
    export { X } from 'path'
    export * from 'path'
    require('path')
    import('path')                       // dynamic

External imports (React, lodash, node_modules) are collected but only
local relative imports become edges — see module_resolver.resolve_js_import.
"""
from __future__ import annotations

import re
from pathlib import Path

from utils.hashing import file_id_for


# ── comments/strings we strip before pattern-matching ─────────────────
_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
_LINE_COMMENT = re.compile(r"(^|\s)//[^\n]*", re.MULTILINE)


def _strip_noise(src: str) -> str:
    src = _BLOCK_COMMENT.sub("", src)
    src = _LINE_COMMENT.sub(r"\1", src)
    return src


# ── import patterns ───────────────────────────────────────────────────
_IMPORT_PATTERNS = [
    re.compile(r"""import\s+[^;{}'"]*?\s+from\s+['"]([^'"]+)['"]""", re.MULTILINE),
    re.compile(r"""import\s+['"]([^'"]+)['"]""", re.MULTILINE),
    re.compile(r"""export\s+(?:\*|\{[^}]+\})\s+from\s+['"]([^'"]+)['"]""", re.MULTILINE),
    re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
]


def extract_imports(source: str) -> list[str]:
    src = _strip_noise(source)
    out: list[str] = []
    seen: set[str] = set()
    for pat in _IMPORT_PATTERNS:
        for m in pat.findall(src):
            if m not in seen:
                seen.add(m)
                out.append(m)
    return out


# ── definitions (functions, classes, React components/hooks) ──────────
# Named function declaration
_FN_DECL = re.compile(
    r"""(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(""",
    re.MULTILINE,
)
# Arrow / function-expression assigned to Capitalized identifier (component/hook)
_FN_ASSIGN = re.compile(
    r"""(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\(|async\s*\([^)]*\)\s*=>|async\s+function\s*\()""",
    re.MULTILINE,
)
_CLASS_DECL = re.compile(
    r"""(?:export\s+(?:default\s+)?)?class\s+([A-Za-z_$][\w$]*)""",
    re.MULTILINE,
)


def extract_defs(source: str) -> tuple[list[str], list[str]]:
    """Returns (function_names, class_names). Preserves declaration order."""
    src = _strip_noise(source)
    fn_names: list[str] = []
    seen: set[str] = set()
    for pat in (_FN_DECL, _FN_ASSIGN):
        for name in pat.findall(src):
            if name in seen:
                continue
            seen.add(name)
            fn_names.append(name)
    classes = list(dict.fromkeys(_CLASS_DECL.findall(src)))
    return fn_names, classes


# ── import bindings (which local name maps to which module) ───────────
# Distinct from `extract_imports`: that only cares about the module path
# (enough for file→file edges). Component-tree / call-graph resolution
# needs to know WHICH name a JSX tag or call-expression identifier refers
# to, so we also parse the clause between `import` and `from`.
_IMPORT_CLAUSE = re.compile(
    r"""import\s+(?P<clause>[^;'"]+?)\s+from\s+['"](?P<module>[^'"]+)['"]""",
    re.MULTILINE,
)


def extract_import_bindings(source: str) -> list[dict]:
    """Per-import-statement local name bindings.

    Returns ``[{"module": str, "default": str|None, "namespace": str|None,
    "names": list[str]}]``. `names` already unwraps `X as Y` aliases to the
    locally-usable name `Y`.
    """
    src = _strip_noise(source)
    out: list[dict] = []
    for m in _IMPORT_CLAUSE.finditer(src):
        clause = m.group("clause").strip()
        module = m.group("module")
        namespace = None
        default = None
        names: list[str] = []

        ns_m = re.match(r"^\*\s+as\s+([A-Za-z_$][\w$]*)$", clause)
        if ns_m:
            namespace = ns_m.group(1)
        else:
            named_m = re.search(r"\{([^}]*)\}", clause)
            default_part = clause[: named_m.start()] if named_m else clause
            default_part = default_part.strip().rstrip(",").strip()
            if default_part and re.match(r"^[A-Za-z_$][\w$]*$", default_part):
                default = default_part
            if named_m:
                for piece in named_m.group(1).split(","):
                    piece = piece.strip()
                    if not piece:
                        continue
                    if " as " in piece:
                        piece = piece.split(" as ")[-1].strip()
                    names.append(piece)

        out.append({"module": module, "default": default, "namespace": namespace, "names": names})
    return out


# ── definition bodies (approximate) ────────────────────────────────────
# Regex-based, so we can't get exact AST boundaries — brace/paren counting
# from the end of each signature match is good enough to slice out a
# function/class body for JSX-usage and call-name scanning.
def _brace_slice(src: str, start: int) -> str:
    n = len(src)
    depth = 0
    j = start
    while j < n:
        c = src[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return src[start : j + 1]
        j += 1
    return src[start:j]


def _expr_slice(src: str, start: int) -> str:
    n = len(src)
    depth = 0
    j = start
    while j < n:
        c = src[j]
        if c in "([{":
            depth += 1
        elif c in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif c == ";" and depth == 0:
            j += 1
            break
        j += 1
    return src[start:j]


def _body_after_signature(src: str, idx: int) -> str:
    """`idx` is where a def-pattern match ended — either just past the `(`
    of a parameter list, or just past an arrow `=>`. Walk forward to the
    actual body and slice it (block body or single-expression arrow body)."""
    n = len(src)
    i = idx
    if idx > 0 and src[idx - 1] == "(":
        depth = 1
        j = i
        while j < n and depth > 0:
            if src[j] == "(":
                depth += 1
            elif src[j] == ")":
                depth -= 1
            j += 1
        i = j
        while i < n and src[i] not in "{;":
            if src.startswith("=>", i):
                i += 2
                break
            i += 1
    while i < n and src[i] in " \t\r\n":
        i += 1
    if i < n and src[i] == "{":
        return _brace_slice(src, i)
    return _expr_slice(src, i)


def _body_of_class(src: str, idx: int) -> str:
    n = len(src)
    i = idx
    while i < n and src[i] != "{":
        i += 1
    if i >= n:
        return ""
    return _brace_slice(src, i)


def extract_definition_blocks(source: str) -> list[dict]:
    """Function/component/hook/class definitions with an approximate body
    slice, for JSX-usage and call-name scanning. Returns
    ``[{"name": str, "kind": "function"|"class", "body": str}]``."""
    src = _strip_noise(source)
    blocks: list[dict] = []
    for pat in (_FN_DECL, _FN_ASSIGN):
        for m in pat.finditer(src):
            blocks.append({"name": m.group(1), "kind": "function", "body": _body_after_signature(src, m.end())})
    for m in _CLASS_DECL.finditer(src):
        blocks.append({"name": m.group(1), "kind": "class", "body": _body_of_class(src, m.end())})
    return blocks


# ── JSX tags / hook calls / call expressions within a body slice ──────
_JSX_TAG = re.compile(r"<([A-Z][\w.]*)")
_HOOK_CALL = re.compile(r"\b(use[A-Z]\w*)\s*\(")
_CALL_EXPR = re.compile(r"(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(")
_CALL_KEYWORDS = {
    "if", "for", "while", "switch", "catch", "function", "return", "typeof",
    "new", "await", "yield", "in", "of", "else", "do", "delete", "void", "throw",
}


def jsx_tags_in(body: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for m in _JSX_TAG.finditer(body):
        name = m.group(1).split(".")[0]
        if name not in seen:
            seen.add(name)
            out.append(name)
    return out


def hook_calls_in(body: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for m in _HOOK_CALL.finditer(body):
        name = m.group(1)
        if name not in seen:
            seen.add(name)
            out.append(name)
    return out


def call_names_in(body: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for m in _CALL_EXPR.finditer(body):
        name = m.group(1)
        if name in _CALL_KEYWORDS or name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out


def analyze_js_file(repo_root: Path, js_path: Path) -> dict:
    """On-demand analysis for the Component Tree / Function Call Graph
    views — deliberately NOT part of `parse_js_file`'s persisted shape
    (keeps the analysis blob small); cheap enough to redo per request.
    """
    try:
        src = js_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return {"import_bindings": [], "definitions": []}

    definitions = []
    for blk in extract_definition_blocks(src):
        definitions.append({
            "name": blk["name"],
            "kind": blk["kind"],
            "jsx_tags": jsx_tags_in(blk["body"]),
            "hook_calls": hook_calls_in(blk["body"]),
            "call_names": call_names_in(blk["body"]),
        })

    return {"import_bindings": extract_import_bindings(src), "definitions": definitions}


# ── very rough cyclomatic complexity approximation ────────────────────
def _complexity(source: str) -> int:
    src = _strip_noise(source)
    keywords = 0
    for kw in ("if ", "if(", "else if", "for ", "for(", "while ", "while(", "case ", "catch "):
        keywords += src.count(kw)
    keywords += src.count("&&")
    keywords += src.count("||")
    keywords += src.count("?.")
    return keywords


# ── kind detection ────────────────────────────────────────────────────
def _kind(rel: str) -> str:
    lo = rel.lower()
    if (lo.endswith((".test.js", ".test.jsx", ".test.ts", ".test.tsx",
                     ".spec.js", ".spec.jsx", ".spec.ts", ".spec.tsx"))
            or "/__tests__/" in lo or "/tests/" in lo or "/test/" in lo):
        return "test"
    if lo.endswith((".config.js", ".config.ts", ".config.mjs", ".config.cjs")):
        return "config"
    if lo.endswith(("/index.js", "/index.jsx", "/index.ts", "/index.tsx",
                    "/index.mjs")) or lo in ("index.js", "index.jsx", "index.ts", "index.tsx"):
        return "init"
    return "module"


_LANG = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
}


def language_for(ext: str) -> str:
    return _LANG.get(ext.lower(), "JavaScript")


# ── public entrypoint ─────────────────────────────────────────────────
def parse_js_file(repo_root: Path, js_path: Path, repo_id: str) -> dict | None:
    """Return a dict compatible with the Python ParsedFile shape."""
    rel = js_path.relative_to(repo_root).as_posix()
    try:
        src = js_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None

    imports = extract_imports(src)
    fn_names, class_names = extract_defs(src)
    branches = _complexity(src)
    lines = src.count("\n") + 1
    avg_cx = 1.0 + branches / max(1, len(fn_names) or 1)
    avg_cx = min(round(avg_cx, 2), 10.0)

    return {
        "id": file_id_for(repo_id, rel),
        "path": rel,
        "name": js_path.name,
        "lines": lines,
        "docstring": None,
        "classes": [
            {"name": c, "bases": [], "lineno": 0, "docstring": None, "methods": []}
            for c in class_names
        ],
        "functions": [
            {"name": f, "args": [], "lineno": 0, "complexity": 1,
             "docstring": None, "is_method": False}
            for f in fn_names
        ],
        "imports": [{"module": imp, "level": 0} for imp in imports],
        "complexity": avg_cx,
        "kind": _kind(rel),
    }
