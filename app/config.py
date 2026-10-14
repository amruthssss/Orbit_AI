"""Environment-backed application configuration."""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    embedding_model: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    tavily_api_key: str | None = os.getenv("TAVILY_API_KEY") or None
    secret_key: str | None = os.getenv("SECRET_KEY") or None
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    database_url: str | None = os.getenv("DATABASE_URL") or None
    redis_url: str | None = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    redis_token: str | None = (
        os.getenv("REDIS_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or None
    )
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8000")
    rate_limit: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    rag_chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "900"))
    rag_chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "120"))
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "5"))
    rag_min_score: float = float(os.getenv("RAG_MIN_SCORE", "0.4"))
    upload_max_bytes: int = int(os.getenv("UPLOAD_MAX_BYTES", "10000000"))
    environment: str = os.getenv("ENVIRONMENT", "development")
    testing: bool = os.getenv("TESTING", "").lower() in {"1", "true", "yes"}


settings = Settings()
GEMINI_API_KEY = settings.gemini_api_key
