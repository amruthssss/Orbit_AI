"""Application services used by the modular API routes."""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import re
import secrets
import requests

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.config import settings
from app.storage import documents, document_chunks_table, documents_table, transaction
from sqlalchemy import select


def chunks(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    words = text.split()
    result = []
    start = 0
    while start < len(words):
        result.append(" ".join(words[start:start + size]))
        start += max(1, size - overlap)
    return result or [""]


def extract_document_text(filename: str, content: bytes) -> str:
    """Extract text from supported uploads without inventing document content."""
    if filename.lower().endswith(".pdf"):
        import io

        try:
            reader = PdfReader(io.BytesIO(content))
        except PdfReadError as exc:
            raise ValueError("Unable to read this PDF file.") from exc
        text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    elif filename.lower().endswith(".docx"):
        import io
        from docx import Document

        document = Document(io.BytesIO(content))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    else:
        text = content.decode("utf-8", errors="replace").strip()
    if not text:
        raise ValueError("The document contains no extractable text.")
    return text


def retrieve(query: str, collection: str = "default", limit: int = 5,
             owner_id: str | None = None) -> list[dict]:
    """Retrieve persisted chunks using Gemini cosine similarity when available."""
    query_embedding = embed_texts([query])[0]
    if query_embedding:
        query_stmt = select(
                    document_chunks_table.c.document_id,
                    document_chunks_table.c.chunk_index,
                    document_chunks_table.c.text,
                    document_chunks_table.c.embedding,
                ).join(
                    documents_table,
                    document_chunks_table.c.document_id
                    == documents_table.c.id,
                ).where(documents_table.c.collection == collection)
        if owner_id is not None:
            query_stmt = query_stmt.where(documents_table.c.owner_id == owner_id)
        with transaction() as db:
            rows = db.execute(query_stmt).mappings().all()
        scored = []
        for row in rows:
            try:
                vector = json.loads(row["embedding"]) if row["embedding"] else None
                score = cosine_similarity(query_embedding, vector) if vector else None
            except (TypeError, ValueError, json.JSONDecodeError):
                score = None
            if score is not None:
                scored.append({
                    "document_id": row["document_id"], "chunk": row["chunk_index"],
                    "score": round(score, 3), "text": row["text"],
                })
        if scored:
            # Add names without exposing document text from unrelated records.
            names = {}
            with transaction() as db:
                name_query = select(documents_table.c.id, documents_table.c.name).where(
                    documents_table.c.collection == collection
                )
                if owner_id is not None:
                    name_query = name_query.where(documents_table.c.owner_id == owner_id)
                names = {
                    row["id"]: row["name"] for row in db.execute(
                        name_query
                    ).mappings()
                }
            for item in scored:
                item["name"] = names.get(item["document_id"], "Unknown document")
            return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]

    # Provider unavailable: retain the inspectable lexical baseline.
    terms = set(re.findall(r"[a-z0-9]{3,}", query.lower()))
    found = []
    for doc in documents(collection, owner_id):
        for index, part in enumerate(chunks(doc["text"])):
            words = re.findall(r"[a-z0-9]{3,}", part.lower())
            score = sum(1 for term in terms if term in words) / max(len(terms), 1)
            if score:
                found.append({"document_id": doc["id"], "name": doc["name"], "chunk": index,
                              "score": round(score, 3), "text": part[:1200]})
    return sorted(found, key=lambda item: item["score"], reverse=True)[:limit]


def cosine_similarity(left: list[float], right: list[float] | None) -> float | None:
    if not right or len(left) != len(right):
        return None
    denominator = math.sqrt(sum(value * value for value in left)) * math.sqrt(
        sum(value * value for value in right)
    )
    return sum(a * b for a, b in zip(left, right)) / denominator if denominator else None


def embed_texts(texts: list[str]) -> list[list[float] | None]:
    """Return Gemini vectors, or null entries when the provider is unavailable."""
    if not texts or not settings.gemini_api_key or settings.testing:
        return [None for _ in texts]
    try:
        from app.llm import client
        if client is None:
            return [None for _ in texts]
        response = client.models.embed_content(model=settings.embedding_model, contents=texts)
        embeddings = getattr(response, "embeddings", None) or []
        values: list[list[float] | None] = []
        for embedding in embeddings:
            vector = getattr(embedding, "values", None)
            values.append([float(value) for value in vector] if vector else None)
        return (values + [None] * len(texts))[:len(texts)]
    except Exception:
        # Retrieval must remain useful if credentials, quotas, or API versions fail.
        return [None for _ in texts]


def analyze_resume(resume: str, job_description: str = "") -> dict:
    text = resume.lower()
    skills = ["python", "typescript", "react", "fastapi", "sql", "aws", "docker", "kubernetes", "git"]
    matched = [skill for skill in skills if skill in text]
    desired = set(re.findall(r"[a-z][a-z+#.-]{2,}", job_description.lower()))
    missing = sorted(skill for skill in desired if skill in skills and skill not in matched)
    score = min(100, 35 + len(matched) * 7 + (10 if job_description and not missing else 0))
    return {"score": score, "matched_skills": matched, "missing_skills": missing,
            "recommendations": ["Add measurable impact to project bullets.",
                                "Tailor the summary to the target role.",
                                "Keep formatting ATS-friendly."]}


def generate_content(kind: str, prompt: str, tone: str) -> str:
    lead = {"email": "Subject: A thoughtful follow-up\n\n",
            "blog": "# " + prompt.strip().capitalize() + "\n\n",
            "social": "A concise post:\n\n", "outline": "## Outline\n\n", "custom": ""}[kind]
    return (lead + f"Here is a {tone} draft based on your brief:\n\n{prompt.strip()}\n\n"
            + "Next steps: validate the claims, add links or examples, and adapt the voice for your audience.")


def research(question: str, depth: str) -> dict:
    if not settings.tavily_api_key:
        return {
            "question": question, "depth": depth, "status": "unavailable",
            "answer": "Web research is unavailable because TAVILY_API_KEY is not configured.",
            "sources": [],
        }
    try:
        response = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": question,
                "search_depth": "advanced" if depth == "deep" else "basic",
                "include_answer": True,
                "max_results": 5 if depth == "quick" else 10,
            },
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        sources = [
            {"title": item.get("title", ""), "url": item.get("url", ""),
             "content": item.get("content", "")}
            for item in payload.get("results", [])
            if item.get("url")
        ]
        answer = payload.get("answer") or (
            "Tavily returned sources but no synthesized answer. Review the linked sources."
        )
        return {"question": question, "depth": depth, "answer": answer,
                "sources": sources, "status": "ready"}
    except (requests.RequestException, ValueError, TypeError):
        return {
            "question": question, "depth": depth, "status": "unavailable",
            "answer": "Web research is temporarily unavailable. No sources were returned.",
            "sources": [],
        }


def run_workflow(name: str, steps: list[str], value: str) -> dict:
    from app.agent_tools import run_tools

    output, completed = run_tools(value, steps)
    return {"name": name, "steps": completed, "output": output.strip()}


def evaluate(actual: str, expected: str) -> float:
    if not expected.strip():
        return 1.0 if actual.strip() else 0.0
    a, e = set(actual.lower().split()), set(expected.lower().split())
    return round(len(a & e) / max(len(e), 1), 4)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        salt, digest = encoded.split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120_000).hex()
        return hmac.compare_digest(actual, digest)
    except (ValueError, TypeError):
        return False
