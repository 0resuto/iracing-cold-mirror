from fastapi.testclient import TestClient

from telemetry.api.app import app
from telemetry.config import settings

client = TestClient(app)


def test_get_status():
    response = client.get("/api/status")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["message"] == "API is running"


def test_upload_api_key_protection(monkeypatch):
    monkeypatch.setattr(settings, "api_key", "secret123")

    response = client.post(
        "/api/sessions/upload",
        files={"file": ("test.ibt", b"dummy content", "application/octet-stream")},
    )
    assert response.status_code == 401

    response = client.post(
        "/api/sessions/upload",
        files={"file": ("test.ibt", b"dummy content", "application/octet-stream")},
        headers={"X-API-Key": "wrong_key"},
    )
    assert response.status_code == 401

    response = client.post(
        "/api/sessions/upload",
        files={"file": ("test.txt", b"dummy content", "text/plain")},
        headers={"X-API-Key": "secret123"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Only .ibt files are allowed"
