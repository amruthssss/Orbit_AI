"""Application services used by the modular API routes."""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.storage import documents


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
    else:
        text = content.decode("utf-8", errors="replace").strip()
    if not text:
        raise ValueError("The document contains no extractable text.")
    return text


def retrieve(query: str, collection: str = "default", limit: int = 5) -> list[dict]:
    terms = set(re.findall(r"[a-z0-9]{3,}", query.lower()))
    found = []
    for doc in documents(collection):
        for index, part in enumerate(chunks(doc["text"])):
            words = re.findall(r"[a-z0-9]{3,}", part.lower())
            score = sum(1 for term in terms if term in words) / max(len(terms), 1)
            if score:
                found.append({"document_id": doc["id"], "name": doc["name"], "chunk": index,
                              "score": round(score, 3), "text": part[:1200]})
    return sorted(found, key=lambda item: item["score"], reverse=True)[:limit]


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
    return {"question": question, "depth": depth,
            "answer": f"Research brief for “{question}”. Start by defining the scope, "
                      "compare primary sources, and record assumptions before drawing conclusions.",
            "sources": [], "status": "ready"}


def run_workflow(name: str, steps: list[str], value: str) -> dict:
    output = value
    completed = []
    for step in steps:
        output = f"{output}\n\n[{step}] completed"
        completed.append({"name": step, "status": "completed"})
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
