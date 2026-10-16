"""Python-only AST parser.

Extracts, per file: classes, functions, imports (with `from` support and
relative-import level), plus a rough cyclomatic complexity score.

Non-Python files are counted separately by language_stats.py — this module
only concerns itself with `*.py`.
"""
from __future__ import annotations

import ast
from dataclasses import dataclass, field
from pathlib import Path

from utils.hashing import file_id_for


@dataclass
class ParsedFunction:
    name: str
    args: list[str]
    lineno: int
    complexity: int
    docstring: str | None = None
    is_method: bool = False


@dataclass
class ParsedClass:
    name: str
    bases: list[str]
    lineno: int
    docstring: str | None = None
    methods: list[str] = field(default_factory=list)


@dataclass
class ImportSpec:
    module: str          # dotted name being imported
    level: int = 0       # 0 = absolute, 1+ = relative (`from .foo import bar`)


@dataclass
class ParsedFile:
    id: str
    path: str            # repo-relative
    name: str
    lines: int
    docstring: str | None = None
    classes: list[ParsedClass] = field(default_factory=list)
    functions: list[ParsedFunction] = field(default_factory=list)
    imports: list[ImportSpec] = field(default_factory=list)
    complexity: float = 1.0
    kind: str = "module"      # module | test | init | script


# ── cyclomatic complexity ─────────────────────────────────────────
_BRANCH = (
    ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler,
    ast.With, ast.AsyncWith, ast.Assert, ast.comprehension,
)


def _cyclomatic(node: ast.AST) -> int:
    count = 1
    for n in ast.walk(node):
        if isinstance(n, _BRANCH):
            count += 1
        elif isinstance(n, ast.BoolOp):
            count += len(n.values) - 1
    return count


# ── extractors ────────────────────────────────────────────────────
def _arg_names(fn: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    out = [a.arg for a in fn.args.args]
    if fn.args.vararg:
        out.append(f"*{fn.args.vararg.arg}")
    out.extend(a.arg for a in fn.args.kwonlyargs)
    if fn.args.kwarg:
        out.append(f"**{fn.args.kwarg.arg}")
    return out


def _base_name(node: ast.expr) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        left = _base_name(node.value)
        return f"{left}.{node.attr}" if left else node.attr
    return ast.unparse(node) if hasattr(ast, "unparse") else "<expr>"


def _parse_tree(tree: ast.AST) -> tuple[list[ParsedClass], list[ParsedFunction], list[ImportSpec]]:
    classes: list[ParsedClass] = []
    functions: list[ParsedFunction] = []
    imports: list[ImportSpec] = []

    for node in tree.body if isinstance(tree, ast.Module) else []:
        if isinstance(node, ast.ClassDef):
            methods = [
                b.name for b in node.body
                if isinstance(b, (ast.FunctionDef, ast.AsyncFunctionDef))
            ]
            classes.append(
                ParsedClass(
                    name=node.name,
                    bases=[_base_name(b) for b in node.bases],
                    lineno=node.lineno,
                    docstring=ast.get_docstring(node),
                    methods=methods,
                )
            )
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append(
                ParsedFunction(
                    name=node.name,
                    args=_arg_names(node),
                    lineno=node.lineno,
                    complexity=_cyclomatic(node),
                    docstring=ast.get_docstring(node),
                )
            )
        elif isinstance(node, ast.Import):
            for a in node.names:
                imports.append(ImportSpec(module=a.name, level=0))
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            imports.append(ImportSpec(module=mod, level=node.level or 0))

    return classes, functions, imports


def _detect_kind(rel: str) -> str:
    lo = rel.lower()
    if lo.endswith("/__init__.py") or lo == "__init__.py":
        return "init"
    if "/tests/" in lo or lo.startswith("tests/") or lo.startswith("test_") or "/test_" in lo or lo.endswith("_test.py"):
        return "test"
    if lo.endswith("/setup.py") or lo == "setup.py" or lo.endswith("/manage.py") or lo == "manage.py":
        return "script"
    return "module"


# ── on-demand call/import analysis for the Function Call Graph view ───
# Deliberately separate from ParsedFile/parse_python_file — not persisted
# in the analysis blob, cheap enough to redo per graph request, and this
# way it works immediately on repos analyzed before this existed.
def analyze_python_calls(repo_root: Path, py_path: Path) -> list[dict]:
    """Per-function/method call info.

    Returns ``[{"name", "qualname", "is_method", "class_name", "calls"}]``
    where `calls` are dotted call-expression heads as written in source
    (e.g. "self.foo", "helper.bar", "baz") — left unresolved here;
    graph/call_graph.py maps them to actual targets.
    """
    try:
        rel = py_path.relative_to(repo_root).as_posix()
        src = py_path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(src, filename=rel)
    except (OSError, ValueError, SyntaxError):
        return []

    def _calls_in(node: ast.AST) -> list[str]:
        out = []
        for n in ast.walk(node):
            if isinstance(n, ast.Call):
                name = _base_name(n.func)
                if name:
                    out.append(name)
        return out

    results: list[dict] = []
    if not isinstance(tree, ast.Module):
        return results

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            for b in node.body:
                if isinstance(b, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    results.append({
                        "name": b.name,
                        "qualname": f"{node.name}.{b.name}",
                        "is_method": True,
                        "class_name": node.name,
                        "calls": _calls_in(b),
                    })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            results.append({
                "name": node.name,
                "qualname": node.name,
                "is_method": False,
                "class_name": None,
                "calls": _calls_in(node),
            })
    return results


def analyze_python_imports(repo_root: Path, py_path: Path) -> list[dict]:
    """Per-import local-name bindings (mirrors js_parser.extract_import_bindings).

    Returns ``[{"local_name", "module", "level", "orig_name"}]`` where
    `orig_name` is ``None`` for ``import module [as alias]`` (whole module
    bound) or the specific name for ``from module import name [as alias]``.
    """
    try:
        rel = py_path.relative_to(repo_root).as_posix()
        src = py_path.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(src, filename=rel)
    except (OSError, ValueError, SyntaxError):
        return []

    out: list[dict] = []
    if not isinstance(tree, ast.Module):
        return out

    for node in tree.body:
        if isinstance(node, ast.Import):
            for a in node.names:
                local = a.asname or a.name.split(".")[0]
                out.append({"local_name": local, "module": a.name, "level": 0, "orig_name": None})
        elif isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            for a in node.names:
                local = a.asname or a.name
                out.append({"local_name": local, "module": mod, "level": node.level or 0, "orig_name": a.name})
    return out


def parse_python_file(repo_root: Path, py_path: Path, repo_id: str) -> ParsedFile | None:
    """Return a ParsedFile, or None if the file couldn't be parsed."""
    rel = py_path.relative_to(repo_root).as_posix()
    try:
        src = py_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None

    try:
        tree = ast.parse(src, filename=rel)
    except SyntaxError:
        # A single unparseable file shouldn't break the whole repo.
        classes, functions, imports = [], [], []
        doc = None
    else:
        classes, functions, imports = _parse_tree(tree)
        doc = ast.get_docstring(tree) if isinstance(tree, ast.Module) else None

    lines = src.count("\n") + 1
    avg_cx = (
        sum(f.complexity for f in functions) / len(functions)
        if functions else 1.0
    )

    return ParsedFile(
        id=file_id_for(repo_id, rel),
        path=rel,
        name=py_path.name,
        lines=lines,
        docstring=doc,
        classes=classes,
        functions=functions,
        imports=imports,
        complexity=round(avg_cx, 2),
        kind=_detect_kind(rel),
    )
