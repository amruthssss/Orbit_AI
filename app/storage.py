"""Transactional persistence for the application.

PostgreSQL is required whenever ``DATABASE_URL`` is configured.  SQLite is
available only for tests that explicitly set ``TESTING=1`` and uses a shared
in-memory database, so production cannot silently create a local database.
"""
from __future__ import annotations

import hashlib
import json
import logging
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy import (
    Column,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    delete,
    func,
    insert,
    select,
    update,
    inspect,
    text as sql_text,
)
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.pool import StaticPool

from app.config import settings

logger = logging.getLogger(__name__)
_lock = threading.RLock()
_engine: Engine | None = None
_db_state = "unconfigured"

metadata = MetaData()
documents_table = Table(
    "documents", metadata,
    Column("id", String(36), primary_key=True),
    Column("name", String(200), nullable=False),
    Column("collection", String(100), nullable=False),
    Column("text", Text, nullable=False),
    Column("chunks", Integer, nullable=False),
    Column("created_at", String(40), nullable=False),
    Column("owner_id", String(64), nullable=True),
)
document_chunks_table = Table(
    "document_chunks", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("document_id", String(36), nullable=False),
    Column("owner_id", String(64), nullable=True),
    Column("chunk_index", Integer, nullable=False),
    Column("text", Text, nullable=False),
    Column("embedding", Text, nullable=True),
)
users_table = Table(
    "users", metadata,
    Column("id", String(64), primary_key=True),
    Column("email", String(200), unique=True, nullable=False),
    Column("name", String(100), nullable=False),
    Column("password_hash", String(256), nullable=False),
    Column("created_at", String(40), nullable=False),
)
usage_table = Table(
    "usage_events", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("kind", String(100), nullable=False),
    Column("session_id", String(100)),
    Column("latency_ms", Float, nullable=False),
    Column("tokens", Integer, nullable=False, default=0),
    Column("created_at", String(40), nullable=False),
    Column("owner_id", String(64), nullable=True),
)
evaluations_table = Table(
    "evaluations", metadata,
    Column("id", String(36), primary_key=True),
    Column("prompt", Text),
    Column("expected", Text),
    Column("actual", Text),
    Column("score", Float, nullable=False),
    Column("created_at", String(40), nullable=False),
    Column("owner_id", String(64), nullable=True),
)
messages_table = Table(
    "messages", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("session_id", String(100), nullable=False),
    Column("role", String(20), nullable=False),
    Column("content", Text, nullable=False),
    Column("created_at", String(40), nullable=False),
    Column("owner_id", String(64), nullable=True),
)


class StorageUnavailable(RuntimeError):
    """Raised when the configured database cannot serve a request."""


class DuplicateUser(ValueError):
    """Raised when an email is already registered."""


def _engine_url() -> str | None:
    if settings.testing:
        return "sqlite://"
    url = settings.database_url
    if not url:
        return None
    if url.startswith("sqlite:"):
        # A file-backed SQLite URL is never accepted outside explicit tests.
        return None
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


def _get_engine() -> Engine:
    global _engine
    if _engine is not None:
        return _engine
    with _lock:
        if _engine is not None:
            return _engine
        url = _engine_url()
        if url is None:
            raise StorageUnavailable("DATABASE_URL is not configured.")
        if url == "sqlite://":
            _engine = create_engine(
                url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            connect_args = {"sslmode": "require"} if "supabase" in url or "pooler" in url else {}
            _engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
        return _engine


@contextmanager
def transaction() -> Iterator[Connection]:
    """Yield a connection with an atomic transaction."""
    try:
        with _get_engine().begin() as connection:
            yield connection
    except SQLAlchemyError as exc:
        raise StorageUnavailable("Database operation failed.") from exc


def init_db() -> bool:
    """Create application tables and record a sanitized connection status."""
    global _db_state
    if _engine_url() is None:
        _db_state = "unconfigured"
        logger.warning("Database is not configured; set DATABASE_URL for runtime persistence.")
        return False
    try:
        engine = _get_engine()
        metadata.create_all(engine)
        # ``create_all`` does not alter tables created by earlier releases.
        # Add the ownership columns idempotently so existing PostgreSQL
        # installations get the same isolation guarantees as new ones.
        ownership_columns = {
            "documents": "owner_id",
            "usage_events": "owner_id",
            "evaluations": "owner_id",
            "messages": "owner_id",
        }
        inspector = inspect(engine)
        for table_name, column_name in ownership_columns.items():
            if column_name not in {column["name"] for column in inspector.get_columns(table_name)}:
                engine_name = engine.dialect.name
                if engine_name == "postgresql":
                    statement = (
                        f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS '
                        f'"{column_name}" VARCHAR(64)'
                    )
                else:
                    statement = (
                        f'ALTER TABLE "{table_name}" ADD COLUMN '
                        f'"{column_name}" VARCHAR(64)'
                    )
                with engine.begin() as connection:
                    connection.execute(sql_text(statement))
        _db_state = "ready"
        return True
    except SQLAlchemyError as exc:
        _db_state = "error"
        logger.error("Database initialization failed (%s).", type(exc).__name__)
        return False


def storage_status() -> str:
    return _db_state


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_document(name: str, text: str, collection: str, chunks: int,
                 owner_id: str | None = None) -> dict:
    from app.services import chunks as chunk_text, embed_texts

    parts = chunk_text(text)
    embeddings = embed_texts(parts)
    item = {
        "id": str(uuid.uuid4()),
        "name": name,
        "collection": collection,
        "chunks": chunks,
        "characters": len(text),
        "created_at": now(),
    }
    with transaction() as db:
        db.execute(insert(documents_table).values(
            id=item["id"], name=name, collection=collection, text=text,
            chunks=chunks, created_at=item["created_at"], owner_id=owner_id,
        ))
        db.execute(insert(document_chunks_table), [
            {"document_id": item["id"], "owner_id": owner_id, "chunk_index": index,
             "text": part, "embedding": json.dumps(embedding) if embedding else None}
            for index, (part, embedding) in enumerate(zip(parts, embeddings))
        ])
    return item


def list_documents(collection: str | None = None, owner_id: str | None = None) -> list[dict]:
    query = select(
        documents_table.c.id, documents_table.c.name, documents_table.c.collection,
        documents_table.c.chunks, func.length(documents_table.c.text).label("characters"),
        documents_table.c.created_at,
    ).order_by(documents_table.c.created_at.desc())
    if collection:
        query = query.where(documents_table.c.collection == collection)
    if owner_id is not None:
        query = query.where(documents_table.c.owner_id == owner_id)
    with transaction() as db:
        rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]


def get_document(document_id: str, owner_id: str | None = None) -> dict | None:
    query = select(
        documents_table.c.id, documents_table.c.name, documents_table.c.collection,
        documents_table.c.text, documents_table.c.chunks,
        func.length(documents_table.c.text).label("characters"),
        documents_table.c.created_at,
    ).where(documents_table.c.id == document_id)
    if owner_id is not None:
        query = query.where(documents_table.c.owner_id == owner_id)
    with transaction() as db:
        row = db.execute(query).mappings().first()
    return dict(row) if row else None


def update_document(
    document_id: str, name: str, text: str, collection: str, chunks: int,
    owner_id: str | None = None
) -> dict | None:
    from app.services import chunks as chunk_text, embed_texts
    parts = chunk_text(text)
    embeddings = embed_texts(parts)
    with transaction() as db:
        predicate = documents_table.c.id == document_id
        if owner_id is not None:
            predicate = predicate & (documents_table.c.owner_id == owner_id)
        result = db.execute(
            update(documents_table)
            .where(predicate)
            .values(name=name, text=text, collection=collection, chunks=chunks)
        )
        if result.rowcount == 0:
            return None
        db.execute(delete(document_chunks_table).where(
            document_chunks_table.c.document_id == document_id
        ))
        db.execute(insert(document_chunks_table), [
            {"document_id": document_id, "owner_id": owner_id, "chunk_index": index,
             "text": part, "embedding": json.dumps(embedding) if embedding else None}
            for index, (part, embedding) in enumerate(zip(parts, embeddings))
        ])
    return get_document(document_id, owner_id)


def delete_document(document_id: str, owner_id: str | None = None) -> bool:
    with transaction() as db:
        predicate = documents_table.c.id == document_id
        if owner_id is not None:
            predicate = predicate & (documents_table.c.owner_id == owner_id)
        result = db.execute(delete(documents_table).where(predicate))
        if result.rowcount:
            db.execute(delete(document_chunks_table).where(
                document_chunks_table.c.document_id == document_id
            ))
    return bool(result.rowcount)


def documents(collection: str = "default", owner_id: str | None = None) -> list[dict]:
    query = select(documents_table.c.id, documents_table.c.name, documents_table.c.text).where(
        documents_table.c.collection == collection
    )
    if owner_id is not None:
        query = query.where(documents_table.c.owner_id == owner_id)
    with transaction() as db:
        rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]


def record_usage(kind: str, session_id: str | None, latency_ms: float, tokens: int = 0,
                 owner_id: str | None = None) -> None:
    with transaction() as db:
        db.execute(insert(usage_table).values(
            kind=kind, session_id=session_id, latency_ms=latency_ms,
            tokens=tokens, created_at=now(), owner_id=owner_id,
        ))


def usage_summary(owner_id: str | None = None) -> dict:
    query = select(
        func.count().label("requests"),
        func.coalesce(func.avg(usage_table.c.latency_ms), 0).label("avg_latency_ms"),
        func.coalesce(func.sum(usage_table.c.tokens), 0).label("tokens"),
    )
    if owner_id is not None:
        query = query.where(usage_table.c.owner_id == owner_id)
    with transaction() as db:
        row = db.execute(query).mappings().one()
    result = dict(row)
    result["avg_latency_ms"] = round(float(result["avg_latency_ms"]), 2)
    return result


def save_message(session_id: str, role: str, content: str, owner_id: str | None = None) -> None:
    with transaction() as db:
        db.execute(insert(messages_table).values(
            session_id=session_id, role=role, content=content, created_at=now(), owner_id=owner_id
        ))


def list_messages(session_id: str, limit: int = 10, owner_id: str | None = None) -> list[dict]:
    query = (
        select(messages_table.c.role, messages_table.c.content)
        .where(messages_table.c.session_id == session_id)
        .order_by(messages_table.c.id.desc())
        .limit(limit)
    )
    if owner_id is not None:
        query = query.where(messages_table.c.owner_id == owner_id)
    with transaction() as db:
        rows = db.execute(query).mappings().all()
    return [dict(row) for row in reversed(rows)]


def session_belongs_to(session_id: str, owner_id: str) -> bool:
    query = select(messages_table.c.id).where(
        messages_table.c.session_id == session_id,
        messages_table.c.owner_id == owner_id,
    ).limit(1)
    with transaction() as db:
        return db.execute(query).first() is not None


def save_evaluation(prompt: str, expected: str, actual: str, score: float,
                    owner_id: str | None = None) -> dict:
    item = {"id": str(uuid.uuid4()), "score": round(score, 4), "created_at": now()}
    with transaction() as db:
        db.execute(insert(evaluations_table).values(
            id=item["id"], prompt=prompt, expected=expected, actual=actual,
            score=item["score"], created_at=item["created_at"], owner_id=owner_id,
        ))
    return item


def create_user(email: str, name: str, password_hash: str) -> dict:
    email = email.lower()
    user_id = hashlib.sha256(email.encode()).hexdigest()[:24]
    try:
        with transaction() as db:
            db.execute(insert(users_table).values(
                id=user_id, email=email, name=name, password_hash=password_hash, created_at=now()
            ))
    except StorageUnavailable as exc:
        if isinstance(exc.__cause__, IntegrityError):
            raise DuplicateUser from exc
        raise
    return {"id": user_id, "email": email, "name": name}


def get_user(email: str) -> dict | None:
    query = select(users_table).where(users_table.c.email == email.lower())
    with transaction() as db:
        row = db.execute(query).mappings().first()
    return dict(row) if row else None
