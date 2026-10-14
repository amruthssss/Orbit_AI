# Orbit AI project audit

**Audit date:** 2026-10-14
**Repository:** `amruthssss/Orbit_AI`
**Starting commit:** `a125cef` (`Show degraded backend status in frontend`)

## Architecture and actual entry points

- **Browser application:** `frontend/src/main.tsx` mounts `frontend/src/App.tsx`. The app uses a local Vite proxy for `/api`, `/chat`, and `/health`. It is a single React application with view state, not a router-driven multi-page app.
- **Active API:** `app/main.py` registers the routes in `app/routes.py`, with services in `app/services.py` and persistence in `app/storage.py`. Local execution is `uvicorn app.main:app`.
- **Compatibility tree:** `backend/app/main.py` imports the root `app.main:app`; the many `backend/app` service, RAG, agent, and model modules are not imported by that entry point. They are unconnected scaffold/legacy code, not evidence of runtime features.
- **Database:** SQLAlchemy Core tables are declared in `app/storage.py`. SQLite is used for local work; PostgreSQL URLs are accepted for hosted use. Documents, chunks, users, messages, evaluations, and usage events are stored. Vectors are serialized JSON values in `document_chunks`, not pgvector. There is no Alembic history.
- **AI integrations:** `app/llm.py` calls Google GenAI when configured. Without a local key, development has a clearly labeled non-AI response. `app/services.py` uses Gemini embeddings when available and lexical retrieval otherwise. Tavily research and Redis are optional.
- **CI:** `.github/workflows/ci.yml` installs the Python requirements, compiles Python, runs pytest, runs `npm ci`, and builds the frontend.
- **Deployment:** there was no deployment-as-code at audit start. Render and Vercel URLs existed externally. Added a Render web-service blueprint and Vercel SPA config; provider dashboard settings remain necessary.

## Feature status based on the active code

| Feature | Status | Evidence / limitation |
|---|---|---|
| Chat and history | Partial | `/chat`, `/chat/stream`, and `/chat/{session_id}` persist messages. Gemini is required for model-backed production answers; local development fallback is explicitly labeled. |
| Authentication | Implemented with limits | Bearer JWT, password hashing, login/register, and owner filters exist. Registration now requires 8 characters. No password reset/refresh flow. |
| Knowledge uploads | Implemented for text extraction | PDF, DOCX, TXT and the additional MD/JSON/CSV formats are accepted; bounded read, MIME/extension checks, empty/malformed rejection, duplicate retry handling. No OCR or background processing state. |
| RAG | Partial | Persisted chunks, optional Gemini vectors, lexical fallback, owner-scoped retrieval, score threshold, and verified chunk references. No pgvector, hybrid retrieval, reranking, or real Gemini evaluation in this environment. |
| Resume lab | Heuristic | Keyword matching and fixed recommendations in `analyze_resume`; not model-based analysis. |
| Content studio | Template-based | Deterministic templates in `generate_content`; no Gemini generation. |
| Research | Provider-backed when configured | Tavily search returns URLs from the provider; absent key and provider failures are reported unavailable. |
| Agents/workflows | Deterministic and bounded | `app/agent_tools.py` allowlists local tools and limits steps. The modular agent orchestration files are not active. |
| Evaluations | Basic lexical overlap | `/api/evaluations` stores a token overlap score. Not an LLM judge or a general RAG/agent evaluation framework. |
| Analytics | Basic | Stored request count, latency average, and token counter (currently not populated with actual token usage). |
| Observability | Basic | `/health`, `/health/ready`, request-ID response headers, and persisted usage. No tracing, structured per-route metrics, or cost accounting. |
| Redis/cache/rate limiting | Optional | Redis/Upstash config and fallback exist. Local fallback is process-scoped; live hosted connectivity has not been verified. |
| PostgreSQL persistence | Code path present; live unverified | PostgreSQL connection URL support exists. Current Render health reports a database error. No Supabase RLS or pgvector schema is present. |

## Confirmed problems and repairs

1. **Frontend API origin was fixed to relative paths.** Restored `VITE_API_URL` support while retaining same-origin local proxy behavior.
2. **Uploads were read fully before the size check and MIME was ignored.** Uploads now read at most configured limit plus one byte and validate extension/MIME combinations.
3. **RAG silently swallowed configured Gemini embedding failures.** Configured-provider failures now produce a clear service error; absent credentials still use the documented lexical baseline in development.
4. **Retrieval chunking diverged from the persisted index and had no threshold or IDs.** Lexical retrieval now reads persisted chunk rows, applies configurable top-k and score floor, and returns chunk IDs; embedding vectors are dimension/value checked and batched.
5. **Grounding treated documents as prompt text without an explicit untrusted-data boundary.** Chat prompts now label document passages untrusted, ask the model to ignore embedded instructions, and append source references generated from the actual retrieved chunk rows.
6. **No distinct readiness endpoint or request correlation existed.** Added `/health/ready` (503 when storage is unavailable) and `X-Request-ID` headers.
7. **Registration accepted very short passwords.** New registrations require at least eight characters, while the existing login minimum remains compatible.
8. **Duplicate uploads could create redundant entries on sequential retries.** Same owner/name/collection/content returns the existing document; concurrent duplicate requests are not protected by a database uniqueness constraint.
9. **Deployment configuration and documentation were missing or overstated.** Added provider config and rewrote README to describe verified behavior and explicit limitations.

## Security and deployment risks

- `.env` is ignored and not tracked. The tracked source scan did not find common Gemini/OpenAI/GitHub token patterns. This is a current-file scan; it is not a guarantee that all historical commits are secret-free.
- Production bearer signing requires `SECRET_KEY`; production chat now fails clearly if Gemini cannot initialize or is unconfigured. PostgreSQL and CORS still need valid provider configuration.
- Existing Render deployment returned `database=error` at audit time. Database state and provider credentials cannot be inspected from this repository.
- Application table creation uses `metadata.create_all` and a small idempotent owner-column adjustment at startup. There is no migration framework; production schema changes should be reviewed and backed up.
- Password hashing is PBKDF2; no email verification, password reset, refresh-token rotation, or account lockout exists.
- PDF OCR, embeddings and provider timeouts/retries, concurrent ingestion control, and true pgvector search are not implemented.
- User filters were tested against persisted documents. Hosted PostgreSQL behavior, real Gemini/Tavily/Redis services, and cross-account live requests still need provider-backed smoke tests.

## Prioritized remaining work

1. Set a valid production PostgreSQL URL and allowed frontend origin in Render; set Gemini credentials there without exposing them to the browser.
2. Deploy the latest commit from Render and verify `/health/ready` and frontend-to-backend auth, upload, search, and chat.
3. Set `VITE_API_URL` in the Vercel project, then redeploy and check browser network/console output.
4. Add managed schema migrations and an actual vector backend/reindex plan before expanding hosted data.
5. Run real-provider RAG evaluation before claiming model grounding quality.
