# NeuroScope — Design Spec

**Date:** 2026-07-24
**Owner:** kiran.vasave@sixt.com
**Status:** Approved for build (user approval: "you can start")

## Tagline
"Understand Any Codebase in Minutes."

## Product goal
A single-user AI-powered code-intelligence platform. User pastes a GitHub URL → NeuroScope clones, parses (Python AST), builds a NetworkX dependency graph, embeds file summaries into FAISS, calls Gemini for natural-language explanations, and presents everything in a dark, minimal, React-Flow-driven UI.

## Non-goals
- No multi-user auth, roles, or teams
- No microservices, Docker, Kubernetes, Redis, Postgres, RabbitMQ
- No non-Python deep parsing (graph is language-agnostic in appearance; parsing is Python-only)
- No WebSockets (polling every 800ms is fine)

## Architecture at a glance
```
Browser (React SPA, Vite, Tailwind, shadcn-style primitives, React Flow, Framer Motion)
   └── HTTPS/JSON ──► FastAPI (uvicorn) on :8000
                        ├── Analyzer orchestrator (background thread + job registry)
                        ├── Parser (GitPython clone + Python AST)
                        ├── Graph builder (NetworkX DiGraph → JSON for React Flow)
                        ├── Embedder (sentence-transformers all-MiniLM-L6-v2 + FAISS)
                        └── AI service (Gemini client; deterministic mock fallback)
                              │
                              └── SQLite (metadata) + FAISS on disk + backend/repos/ (clones)
```

## Design decisions (approved)
1. **Gemini is optional.** `GEMINI_API_KEY` env var; when absent, a deterministic template-based fallback still produces contextual answers from parsed metadata. A bundled sample repo ships in `backend/samples/` so the app is demoable offline.
2. **Parsing is Python-only.** Non-Python files are counted (for language stats) but not parsed. The React-Flow graph is visually language-agnostic — nodes represent modules/services conceptually.
3. **Plain JavaScript + JSDoc** on the frontend (not TypeScript). Beginner-friendly.
4. **Background thread + polling** for analysis progress, not WebSockets.
5. **SQLite + FAISS on disk** — no other data stores.
6. **Six phases**, one commit per phase, matching the user's brief.

## Design system (tokens live in `frontend/src/styles/tokens.css`)
- **Palette:** deep navy background (`#0a0e1a`), elevated panels (`#0f1524` → `#141b2d`), hairline borders (`rgba(255,255,255,0.06)`).
- **Accents:** blue `#3b82f6`, cyan `#06b6d4`, emerald `#10b981`, amber `#f59e0b`, red `#ef4444`, purple `#8b5cf6`, pink `#ec4899`.
- **Gradients used only on:** primary buttons, selected graph nodes, logo mark.
- **Typography:** Inter, tabular numerals for stats.
- **Radius:** 6 / 10 / 14 / 20.
- **Motion:** 120 / 200 / 320 ms; `cubic-bezier(0.16, 1, 0.3, 1)` for exits.

## API contract (v1)
| Method | Path | Purpose |
|---|---|---|
| GET  | `/health` | liveness |
| GET  | `/samples` | bundled sample repos |
| POST | `/analyze` | `{repo_url}` → `{repo_id, job_id}` |
| GET  | `/analyze/{job_id}/status` | `{stage, progress, error?}` |
| GET  | `/repos/{repo_id}` | overview card data |
| GET  | `/repos/{repo_id}/graph` | `{nodes, edges}` |
| GET  | `/repos/{repo_id}/files/{file_id}` | file detail |
| GET  | `/repos/{repo_id}/metrics` | chart datasets |
| GET  | `/repos/{repo_id}/risks` | risk list |
| POST | `/repos/{repo_id}/search` | semantic search |
| POST | `/repos/{repo_id}/chat` | AI chat (level-conditioned) |
| POST | `/repos/{repo_id}/explain/{file_id}` | file explanation at level |

## AI pipeline
1. Chunk AST output (file + function + class docstrings)
2. Embed with `sentence-transformers/all-MiniLM-L6-v2`
3. Store in FAISS `IndexFlatIP` at `backend/cache/{repo_id}.faiss`
4. On query: embed query → top-k retrieval → context assembly → Gemini call with level-conditioned system prompt (beginner / intermediate / senior / interview)
5. Cache file-level explanations in SQLite keyed by `(file_id, level)`

## Folder structure
See `README.md` (kept in sync).

## Build phases
| # | Phase | Contents | Commit |
|---|---|---|---|
| 1 | Skeleton | Project setup, folders, design tokens, sidebar, top nav, routing, API scaffold | ✅ |
| 2 | Analysis engine | Clone, parse, dependency extraction | ✅ |
| 3 | Graph visualization | React Flow, node panel, animations | ✅ |
| 4 | AI + search | Embeddings, semantic search, Gemini chat, learning mode | ✅ |
| 5 | Risk + metrics | Risk detectors, charts, learning-mode surfacing | ✅ |
| 6 | Polish | Responsive, loading, errors, README, final testing | ✅ |

## Success criteria
- `python -m venv venv && pip install -r requirements.txt && uvicorn main:app --reload` starts in <30s (excluding first-run model download).
- `npm install && npm run dev` boots the SPA against the backend.
- Pasting a small public GitHub URL → full analysis + graph in <60s on a laptop.
- App remains fully usable and impressive with no `GEMINI_API_KEY`.
