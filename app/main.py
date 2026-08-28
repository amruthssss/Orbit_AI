"""FastAPI application entry point for the Orbit AI engineering platform."""
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.guardrails import GuardrailViolation, check_input
from app.llm import (
    LLMProviderError,
    RateLimitError,
    clear_conversation,
    generate_response,
    generate_stream,
)
from app.routes import api
from app.schemas import ChatRequest, ChatResponse
from app.storage import StorageUnavailable, init_db, record_usage, storage_status
from app.cache import allow_request, cache_status
import time

init_db()
app = FastAPI(title="Orbit AI Engineering Platform", version="2.0.0",
              description="Modular chat, retrieval, content, agent and evaluation APIs.")
allowed_origins = {
    origin.strip()
    for origin in settings.cors_origins.split(",")
    if origin.strip()
}
allowed_origins.add("https://orbit-ai-nine-pi.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.include_router(api)


@app.exception_handler(StorageUnavailable)
async def storage_error(_: Request, exc: StorageUnavailable):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path.startswith(("/chat", "/api")) and not allow_request(request.client.host if request.client else "unknown"):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Try again shortly."})
    return await call_next(request)


@app.get("/health", tags=["system"])
def health():
    database = storage_status()
    status = "ok" if database == "ready" else "degraded"
    return {
        "status": status,
        "environment": settings.environment,
        "database": database,
        "redis": cache_status()["mode"],
        "gemini_model": settings.gemini_model,
    }


@app.get("/")
def home(request: Request):
    frontend = Path(__file__).resolve().parent.parent / "frontend"
    built = frontend / "dist"
    serve_dir = built if (built / "index.html").exists() else frontend
    if "text/html" in request.headers.get("accept", "") and (serve_dir / "index.html").exists():
        return FileResponse(serve_dir / "index.html")
    return {"message": "AI Chatbot API is running"}


frontend = Path(__file__).resolve().parent.parent / "frontend"
for prefix in ("assets", "static"):
    directory = (frontend / "dist" / prefix) if (frontend / "dist" / "index.html").exists() else frontend
    if directory.exists():
        app.mount(f"/{prefix}", StaticFiles(directory=directory), name=prefix)


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    start = time.perf_counter()
    try:
        response = generate_response(request.session_id, request.message)
        if storage_status() == "ready":
            record_usage("chat", request.session_id, (time.perf_counter() - start) * 1000)
        return ChatResponse(session_id=request.session_id, response=response)
    except GuardrailViolation as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except (LLMProviderError, StorageUnavailable) as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to generate a response.")


@app.delete("/chat/{session_id}")
def reset_chat(session_id: str):
    clear_conversation(session_id)
    return {"message": "Conversation cleared", "session_id": session_id}


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    valid, reason = check_input(request.message)
    if not valid:
        raise HTTPException(status_code=400, detail=reason)
    def tracked_stream():
        start = time.perf_counter()
        try:
            yield from generate_stream(request.session_id, request.message)
        finally:
            if storage_status() == "ready":
                record_usage("chat_stream", request.session_id, (time.perf_counter() - start) * 1000)

    return StreamingResponse(tracked_stream(), media_type="text/plain")
