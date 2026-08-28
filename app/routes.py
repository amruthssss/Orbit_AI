"""Versioned API routers for platform modules."""
from __future__ import annotations
import base64
import time
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.schemas import (AuthRequest, ChatRequest, DocumentCreate, EvaluationRequest,
                         GenerateRequest, ResumeRequest, ResearchRequest, SearchRequest,
                         WorkflowRequest)
from app.services import (analyze_resume, chunks, evaluate, extract_document_text,
                          generate_content, hash_password, research, retrieve, run_workflow,
                          verify_password)
from app.storage import (
    DuplicateUser,
    StorageUnavailable,
    add_document,
    create_user,
    delete_document,
    get_user,
    get_document,
    list_documents,
    record_usage,
    save_evaluation,
    update_document,
    usage_summary,
)

api = APIRouter(prefix="/api")
auth = APIRouter(prefix="/auth", tags=["auth"])
knowledge = APIRouter(prefix="/knowledge", tags=["knowledge"])
tools = APIRouter(tags=["ai-tools"])
observability = APIRouter(prefix="/observability", tags=["observability"])


@auth.post("/register")
def register(request: AuthRequest):
    try:
        user = create_user(request.email, request.name, hash_password(request.password))
    except DuplicateUser:
        raise HTTPException(409, "An account with this email already exists.")
    except StorageUnavailable as exc:
        raise HTTPException(503, str(exc))
    return {"user": user,
            "token": base64.urlsafe_b64encode(f"{user['id']}:{user['email']}".encode()).decode()}


@auth.post("/login")
def login(request: AuthRequest):
    try:
        user = get_user(request.email)
    except StorageUnavailable as exc:
        raise HTTPException(503, str(exc))
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password.")
    return {"user": {"id": user["id"], "email": user["email"], "name": user["name"]},
            "token": base64.urlsafe_b64encode(f"{user['id']}:{user['email']}".encode()).decode()}


@knowledge.post("/documents")
def upload_document(request: DocumentCreate):
    item = add_document(request.name, request.text, request.collection, len(chunks(request.text)))
    return {"document": item}


@knowledge.post("/documents/upload")
async def upload_document_file(file: UploadFile = File(...), collection: str = "default"):
    if not file.filename:
        raise HTTPException(400, "A document file is required.")
    if not file.filename.lower().endswith((".pdf", ".txt", ".md", ".json", ".csv", ".docx")):
        raise HTTPException(415, "Supported files are PDF, DOCX, TXT, MD, JSON, and CSV.")
    content = await file.read()
    await file.close()
    if len(content) > 10_000_000:
        raise HTTPException(413, "Document exceeds the 10 MB upload limit.")
    try:
        text = extract_document_text(file.filename, content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"document": add_document(file.filename, text, collection, len(chunks(text)))}


@knowledge.get("/documents")
def get_documents(collection: str = "default"):
    return {"documents": list_documents(collection)}


@knowledge.get("/documents/{document_id}")
def get_document_endpoint(document_id: str):
    document = get_document(document_id)
    if document is None:
        raise HTTPException(404, "Document not found.")
    return {"document": document}


@knowledge.put("/documents/{document_id}")
def update_document_endpoint(document_id: str, request: DocumentCreate):
    document = update_document(
        document_id, request.name, request.text, request.collection, len(chunks(request.text))
    )
    if document is None:
        raise HTTPException(404, "Document not found.")
    return {"document": document}


@knowledge.delete("/documents/{document_id}")
def delete_document_endpoint(document_id: str):
    if not delete_document(document_id):
        raise HTTPException(404, "Document not found.")
    return {"deleted": True, "id": document_id}


@knowledge.post("/search")
def search_documents(request: SearchRequest):
    return {"results": retrieve(request.query, request.collection, request.limit)}


@tools.post("/resume/analyze")
def resume_analyze(request: ResumeRequest):
    return analyze_resume(request.resume, request.job_description)


@tools.post("/resume/analyze-file")
async def resume_analyze_file(
    file: UploadFile = File(...), job_description: str = ""
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(415, "Please upload a PDF resume.")
    content = await file.read()
    await file.close()
    if len(content) > 10_000_000:
        raise HTTPException(413, "Resume exceeds the 10 MB upload limit.")
    try:
        resume = extract_document_text(file.filename, content)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return analyze_resume(resume, job_description)


@tools.post("/content/generate")
def content_generate(request: GenerateRequest):
    start = time.perf_counter()
    output = generate_content(request.kind, request.prompt, request.tone)
    record_usage("content", None, (time.perf_counter() - start) * 1000)
    return {"content": output, "kind": request.kind}


@tools.post("/research")
def research_endpoint(request: ResearchRequest):
    return research(request.question, request.depth)


@tools.post("/workflows/run")
def workflow_endpoint(request: WorkflowRequest):
    return run_workflow(request.name, request.steps, request.input)


@tools.post("/evaluations")
def evaluation_endpoint(request: EvaluationRequest):
    score = evaluate(request.actual, request.expected)
    return {"evaluation": save_evaluation(request.prompt, request.expected, request.actual, score), "score": score}


@observability.get("/metrics")
def metrics():
    return {"usage": usage_summary(), "features": ["chat", "rag", "resume", "content", "research", "workflows", "evaluations"]}


api.include_router(auth)
api.include_router(knowledge)
api.include_router(tools)
api.include_router(observability)
