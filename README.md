# Orbit AI Engineering Platform

Orbit is a production-shaped FastAPI + React workspace for chat, retrieval,
content, resume analysis, research briefs, workflows and evaluations.

## Run locally

```powershell
Copy-Item .env.example .env
.\venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload
cd frontend; npm run dev
```

The API works without a hosted model using a transparent local fallback. Set
`GEMINI_API_KEY` for Gemini-backed responses. Production persistence requires
`DATABASE_URL` (Supabase PostgreSQL); the only SQLite adapter is the explicit
in-memory test fallback enabled by `TESTING=1`. `REDIS_URL` (and `REDIS_TOKEN`
for Upstash REST URLs) enables distributed caching and rate limiting.
Open `http://localhost:5173` for the workspace and `/docs` for the API.

## Modules

`/chat` and `/chat/stream`, `/api/knowledge`, `/api/resume/analyze`,
`/api/content/generate`, `/api/research`, `/api/workflows/run`,
`/api/evaluations`, `/api/observability/metrics`, and local auth routes are
versioned, independently testable surfaces. Uploaded text is chunked and
persisted with Gemini embeddings when available, with a transparent lexical
fallback. Set `TAVILY_API_KEY` for real web research; without it the API
reports research as unavailable rather than inventing sources. Set
`SECRET_KEY` in production: JWT bearer authentication protects documents,
evaluations, metrics, and chat history (development/tests remain anonymous for
local compatibility).
