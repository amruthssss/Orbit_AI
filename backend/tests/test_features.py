from dataclasses import replace

from fastapi.testclient import TestClient

from backend.app.main import app
from app.agent_tools import run_tools
from app.security import create_access_token, decode_access_token
import app.services as services
from app.services import cosine_similarity


client = TestClient(app)


def test_jwt_round_trip_and_cosine_similarity():
    user = {"id": "user-1", "email": "user@example.com", "name": "User"}
    claims = decode_access_token(create_access_token(user))
    assert claims["sub"] == user["id"]
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0


def test_research_is_honest_without_tavily_key(monkeypatch):
    monkeypatch.setattr(services, "settings", replace(services.settings, tavily_api_key=None))
    result = services.research("a question", "quick")
    assert result["status"] == "unavailable"
    assert result["sources"] == []
    assert "unavailable" in result["answer"].lower()


def test_workflow_registry_rejects_unknown_tools():
    output, steps = run_tools("Write a note", ["Understand", "Review"])
    assert steps[0]["name"] == "Understand"
    assert "Review:" in output
    try:
        run_tools("Write a note", ["Private internal reasoning"])
    except ValueError as exc:
        assert "Unsupported workflow tool" in str(exc)
    else:
        raise AssertionError("unknown workflow tool was accepted")


def test_workflow_route_returns_validation_error():
    response = client.post("/api/workflows/run", json={
        "name": "safe", "steps": ["unknown"], "input": "hello"
    })
    assert response.status_code == 422
