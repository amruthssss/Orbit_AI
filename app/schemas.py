from typing import Any, Literal
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str = Field(
        min_length=1,
        max_length=100
    )
    message: str = Field(
        max_length=1000
    )


class ChatResponse(BaseModel):
    session_id: str
    response: str
    model: str | None = None
    sources: list[dict[str, Any]] = Field(default_factory=list)


class DocumentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=200_000)
    collection: str = Field(default="default", max_length=100)


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    collection: str = "default"
    limit: int = Field(default=5, ge=1, le=20)


class AuthRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=4, max_length=200)
    name: str = Field(default="Local user", max_length=100)


class GenerateRequest(BaseModel):
    kind: Literal["email", "blog", "social", "outline", "custom"] = "custom"
    prompt: str = Field(min_length=1, max_length=5000)
    tone: str = Field(default="professional", max_length=50)


class ResumeRequest(BaseModel):
    resume: str = Field(min_length=1, max_length=50_000)
    job_description: str = Field(default="", max_length=50_000)


class ResearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    depth: Literal["quick", "standard", "deep"] = "standard"


class WorkflowRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    steps: list[str] = Field(min_length=1, max_length=20)
    input: str = Field(default="", max_length=5000)


class EvaluationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=5000)
    expected: str = Field(default="", max_length=5000)
    actual: str = Field(min_length=1, max_length=10000)