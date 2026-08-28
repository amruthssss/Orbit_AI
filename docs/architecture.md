# Architecture phase

The repository keeps the proven root `app` package as the compatibility
runtime. `backend/app` provides the target modular boundaries: API composition,
core configuration, persistence, domain models, schemas, services,
repositories, integrations, agents, middleware, guardrails, and utilities.

The React entry point remains `frontend/src/App.tsx`; component, page, hook,
service, type, and utility folders are additive seams for incremental
migration. No feature behavior is moved in this phase.
