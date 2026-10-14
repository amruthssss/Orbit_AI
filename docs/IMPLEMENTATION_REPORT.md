# Implementation report

**Date:** 2026-10-14

## Changes

- Restored production API-origin support with `VITE_API_URL`, keeping the local Vite proxy as the default.
- Added deployment configuration for Render (`render.yaml`) and Vercel (`frontend/vercel.json`). Secrets are placeholders or generated values; no credentials are included.
- Added request-ID response headers and a database readiness endpoint.
- Added environment-driven RAG chunk size/overlap, top-k, minimum score, and bounded upload size.
- Made upload reads bounded, checked filename extension and MIME, handled malformed/empty PDF and DOCX content, and made sequential retries idempotent for same owner/name/collection/content.
- Changed lexical retrieval to score the persisted chunks, include their database chunk IDs, enforce user/document filters, and reject results below the configured threshold.
- Validated Gemini embedding responses and dimensions, batched at 64 inputs, and stopped silently swallowing configured-provider failures.
- Marked retrieved passages as untrusted context and appended source labels tied to retrieved document/chunk records.
- Required eight-character passwords at registration while preserving existing sign-in compatibility.
- Added deterministic PDF/TXT/DOCX, upload validation, retrieval, ownership, and citation tests; added a golden RAG dataset and a script that writes measured JSON results.
- Replaced the old feature-heavy README with verified architecture, setup, limitations, tests, and deployment steps.

## Files changed

`app/config.py`, `app/llm.py`, `app/main.py`, `app/routes.py`, `app/services.py`, `app/storage.py`, `backend/tests/test_rag.py`, `frontend/src/App.tsx`, `.env.example`, `README.md`; created Render/Vercel configuration, `scripts/run_rag_evaluation.py`, the RAG golden dataset, and audit/test/deployment reports.

## Local verification

- Backend tests and TypeScript/Vite production build are run after the last source changes and recorded in `TEST_REPORT.md`.
- Local FastAPI `/health` and `/health/ready` both returned HTTP 200 with SQLite ready. Vite served the application and proxied `/health` successfully.
- Gemini SDK and DOCX extraction imports succeeded after installing those declared dependencies into the active Python environment. The separate Python 3.12 virtual environment could not install dependencies because pip's certificate validation to PyPI failed. The user's API key was not read or displayed; real Gemini calls were not made.

## Known implementation limits

Embedding retries, OCR, asynchronous ingestion states, concurrency-safe deduplication, pgvector, model-generated answer faithfulness evaluation, and Alembic migrations remain future work. If Gemini is configured but its embedding API fails, indexing/search return a visible 503 rather than silently changing to lexical results.
