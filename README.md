# Orbit AI

Orbit AI is a React workspace backed by a FastAPI service for chat, document search, resume review, content drafting, research, workflows, and evaluations.

## Verified architecture

- The active API is the root `app/` package, started with `uvicorn app.main:app`.
- The active browser app is `frontend/src/App.tsx`, built with Vite and React.
- `backend/app/main.py` re-exports the root FastAPI app. The surrounding `backend/app/` modules are not wired into the running API.
- SQLAlchemy stores users, documents, document chunks, chat messages, evaluations, and usage events. Local development uses SQLite; hosted deployments require PostgreSQL.
- Chunks and optional Gemini embedding vectors are stored in SQL tables. Without Gemini credentials, retrieval uses a deterministic lexical baseline. This is not pgvector.
- Redis and Tavily are optional. Missing or failed providers are reported as unavailable; research does not invent sources.
- Docker is not needed.

## Local setup

Python 3.12+ and Node.js 20+ are used in CI. From the repository root:

```powershell
Copy-Item .env.example .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Set `SECRET_KEY` to a private random value before registering local accounts. `GEMINI_API_KEY` enables Gemini generation and embeddings. For local development, SQLite is configured by default and Gemini can be omitted; the UI will clearly identify local fallback behavior.

Start the API in one terminal:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Start the frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open <http://127.0.0.1:5188>. Vite proxies `/api`, `/chat`, and `/health` to port 8001. API docs are at <http://127.0.0.1:8001/docs>. The SQLite database is `data/orbit.db` and is ignored by Git.

## Configuration

Copy `.env.example` to `.env`. Backend secrets remain server-side. `VITE_API_URL` is empty for local development; set it to the backend origin when building the hosted frontend. In Vercel, set it in the frontend project's environment settings and redeploy. Configure `CORS_ORIGINS` on the API to the exact frontend origin.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes for persistence; required in production | SQLite locally or PostgreSQL when hosted |
| `SECRET_KEY` | Yes in production | Signs bearer tokens; use a long random value |
| `GEMINI_API_KEY` | Required for model-backed production chat | Gemini generation and embeddings |
| `GEMINI_MODEL` | No | Chat model; defaults to `gemini-3.6-flash` |
| `GEMINI_EMBEDDING_MODEL` | No | Embedding model; defaults to `gemini-embedding-001` |
| `CORS_ORIGINS` | Yes when frontend is hosted separately | Comma-separated exact frontend origins |
| `VITE_API_URL` | Yes when frontend is hosted separately | Public API origin, compiled into the browser bundle |
| `RATE_LIMIT_PER_MINUTE` | No | Fixed-window request limit per client key |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | No | Word-based chunking settings |
| `RAG_TOP_K` / `RAG_MIN_SCORE` | No | Retrieval limit and evidence threshold |
| `UPLOAD_MAX_BYTES` | No | Maximum streamed upload size; default 10 MB |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No | Shared cache/rate limiter |
| `TAVILY_API_KEY` | No | Web research provider |
| `ENVIRONMENT` | No | Set to `production` for hosted services |

## Features and limitations

- Chat persists messages and streams model output when Gemini is configured. Local mode uses a clearly labeled deterministic fallback. Production mode returns an error when Gemini is not configured.
- Knowledge uploads support PDF, DOCX, TXT, MD, JSON, and CSV with a 10 MB default size limit. PDFs without extractable text (including scanned PDFs) are rejected; OCR is not configured.
- Document search returns persisted chunk IDs and applies user ownership filters. Gemini embeddings are validated and stored as JSON vectors; without Gemini, search uses lexical matching. Thresholds are configurable.
- Chat injects retrieved text as untrusted context and appends references to the actual retrieved document chunks. The golden evaluation measures retrieval only; it does not claim real-model answer faithfulness.
- Resume review and content drafting are deterministic heuristics/templates, not Gemini features. Workflows use a bounded allowlist of local tools. Research uses Tavily only when configured.
- Analytics currently reports stored request counts and latency; token counts/cost are not measured. Agent/RAG/LLM evaluation dashboards beyond the existing lexical evaluation endpoint are not implemented.
- The active schema is created at startup with SQLAlchemy `create_all`; there is no Alembic migration history. Review schema changes before applying them to an existing hosted database.

## Tests and evaluation

Run from the repository root:

```powershell
python -m compileall -q app backend eval scripts
python -m pytest -q
python scripts/run_rag_evaluation.py
cd frontend
npm ci
npm run build
```

The RAG command writes measured deterministic results to `docs/RAG_EVALUATION_RESULTS.json`. It sets `TESTING=1` and uses an in-memory database; it does not call Gemini. Tests that mock Gemini are identified in the test suite. The suite does not replace live provider or hosted database checks.

## Deployment

The repository includes `render.yaml` for the FastAPI service and `frontend/vercel.json` for the Vite SPA. Set these values in the hosting dashboards:

1. In Render, provide a reachable PostgreSQL `DATABASE_URL`, `GEMINI_API_KEY`, and the Vercel origin in `CORS_ORIGINS`. The blueprint generates a `SECRET_KEY`.
2. In Vercel, use `frontend/` as the project root and set `VITE_API_URL` to the Render API origin, with no trailing slash.
3. Deploy the backend, confirm `/health/ready`, then deploy the frontend and test sign-in, uploads, search, and chat.

Current public links: [Orbit AI frontend](https://orbit-ai-nine-pi.vercel.app/) · [Render API health](https://orbit-ai-efzz.onrender.com/health). After commit `dd8f3cf` was pushed, Vercel served a new frontend bundle. Render still reported `status=degraded` and `database=error`, and `/health/ready` returned 404, so hosted sign-in, upload, search, and chat are not verified yet.

## Reports

- [Project audit](docs/PROJECT_AUDIT.md)
- [Implementation report](docs/IMPLEMENTATION_REPORT.md)
- [Test report](docs/TEST_REPORT.md)
- [RAG evaluation report](docs/RAG_EVALUATION_REPORT.md)
- [Deployment report](docs/DEPLOYMENT_REPORT.md)
