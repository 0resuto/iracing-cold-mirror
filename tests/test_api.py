from fastapi.testclient import TestClient

from telemetry.api.app import app

client = TestClient(app)


def test_get_status():
    response = client.get("/api/status")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["message"] == "API is running"
