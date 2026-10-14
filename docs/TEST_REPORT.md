# Test report

**Date:** 2026-10-14

## Commands and outcomes

| Command | Result |
|---|---|
| `python -m compileall -q app backend eval scripts` | Passed |
| `python -m pytest -q` | 26 passed; one upstream `pytest-asyncio` configuration deprecation warning |
| `python scripts/run_rag_evaluation.py` | Passed; wrote `docs/RAG_EVALUATION_RESULTS.json` |
| `cd frontend; npm run build` | Passed; TypeScript check and Vite production build (29 modules) |
| Local `GET /health` on port 8001 | HTTP 200, status `ok`, database `ready` |
| Local `GET /health/ready` on port 8001 | HTTP 200, status `ready` |
| Local `GET /` and proxied `GET /health` on port 5188 | HTTP 200 |

The tests cover the active SQLite-backed API in `TESTING=1` mode. Gemini behavior is mocked for the citation-flow test; there were no live Gemini, PostgreSQL, Redis, Tavily, Render, or Vercel write/deploy tests. The user's local browser displayed the sign-in screen after an expired session; no credentials were entered.

## Added coverage

- PDF, TXT, and DOCX text extraction plus malformed, empty, and no-extractable-text documents.
- End-to-end upload of valid PDF, TXT, and DOCX fixtures.
- Chunk size/overlap and invalid chunk settings.
- Oversized and MIME/extension-mismatched upload rejection, malformed PDFs, and sequential duplicate retry behavior.
- Retrieval metadata, score filtering, and per-user document isolation.
- Grounded chat prompt treatment and appended citation labels tied to a persisted chunk.
- Database readiness and request-ID headers.
- Authenticated document ownership through register and two separately tokenized users.
- Gemini embedding batch sizing/shape validation using a mock provider, plus production missing-provider behavior.

## Not tested / remaining checks

- No browser automation submission of credentials or personal documents. UI build and local page loading were verified.
- No real model generation, embeddings, quota exhaustion, or provider latency/failure behavior.
- No PostgreSQL migration/persistence run, Redis rate-limit boundary test, or hosted API cross-account smoke test.
- No lint or static type-check beyond the TypeScript check executed by `npm run build`; no Python linter is configured.
