from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_and_knowledge_search():
    assert client.get("/health").json()["status"] == "ok"
    created = client.post(
        "/api/knowledge/documents",
        json={
            "name": "test.txt",
            "text": "Python services use FastAPI and Docker.",
            "collection": "tests",
        },
    )
    assert created.status_code == 200
    found = client.post(
        "/api/knowledge/search",
        json={"query": "FastAPI Docker", "collection": "tests"},
    )
    assert found.status_code == 200
    assert found.json()["results"][0]["name"] == "test.txt"


def test_tool_and_evaluation_endpoints():
    resume = client.post(
        "/api/resume/analyze",
        json={"resume": "Python FastAPI React", "job_description": "Python SQL"},
    )
    assert resume.status_code == 200
    assert "python" in resume.json()["matched_skills"]
    evaluation = client.post(
        "/api/evaluations",
        json={"prompt": "check", "expected": "one two", "actual": "one three"},
    )
    assert evaluation.status_code == 200
    assert evaluation.json()["score"] == 0.5
