# Deployment report

**Checked:** 2026-10-14

## Configuration prepared

- Added `render.yaml` for the root FastAPI service, production environment, generated signing secret, externally supplied database/API settings, and `/health/ready` check.
- Added `frontend/vercel.json` for a Vite static build with SPA fallback.
- Frontend API origin is read from `VITE_API_URL`; backend CORS origins are configured through `CORS_ORIGINS`.
- Local development is running without Docker on `127.0.0.1:8001` (FastAPI/SQLite) and `127.0.0.1:5188` (Vite). Local `/health` and `/health/ready` returned 200 with database ready.

## Existing public deployment probe

| URL | Observed result |
|---|---|
| [Vercel frontend](https://orbit-ai-nine-pi.vercel.app/) | HTTP 200; returned an HTML document. Its published JavaScript bundle contains the existing Render API origin, but this does not prove API calls succeed. |
| [Render `/health`](https://orbit-ai-efzz.onrender.com/health) | HTTP 200; JSON reported `status=degraded` and `database=error`. Redis mode was reported as `upstash-rest`; a Redis round trip was not verified. |
| [Render `/health/ready`](https://orbit-ai-efzz.onrender.com/health/ready) | HTTP 404 on the currently deployed service; it has not yet deployed this checkout's readiness route. |

The live frontend and API are therefore not end-to-end healthy. No live login, upload, retrieval, or chat test was possible with the database degraded. A production API key was not read or transmitted.

## Required provider actions

1. In the Render service, supply a valid PostgreSQL `DATABASE_URL` and exact Vercel site origin in `CORS_ORIGINS`; provide `GEMINI_API_KEY` for real model chat and embeddings. The repository does not have access to these dashboard values.
2. Deploy/sync the root `render.yaml` blueprint or update the existing Render service to use `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, then wait for the health check.
3. In the Vercel project, confirm its root directory is `frontend`, set `VITE_API_URL` to the Render API origin, and redeploy.
4. After both hosts are healthy, test account registration/login, upload each file type, search, grounded citations, unsupported questions, and user isolation against the hosted PostgreSQL database.

No claim of a new successful deployment is made in this report. Existing public URLs are links to the previously deployed services; the deployment configuration in this checkout still needs provider sync and the database fix.
