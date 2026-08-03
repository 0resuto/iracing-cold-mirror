from telemetry.config import settings
from telemetry.db.models import Lap, Player, Session


def test_get_status(client):
    response = client.get("/api/status")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["message"] == "API is running"


def test_upload_api_key_protection(client, monkeypatch):
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


def test_players_history_empty(client):
    response = client.get("/api/players_history")
    assert response.status_code == 200
    assert response.json() == []


def test_players_history_with_data(client, db_session):
    player = Player(name="Test Driver")
    db_session.add(player)
    db_session.commit()

    response = client.get("/api/players_history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Test Driver"


def test_system_info(client, db_session):
    response = client.get("/api/system_info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["total_players"] == 0
    assert data["total_sessions"] == 0


def test_get_best_lap_not_found(client):
    response = client.get("/api/players/1/best_lap?track_name=Spa")
    assert response.status_code == 404
    assert response.json()["detail"] == "Best lap not found"


def test_get_best_lap_success(client, db_session):
    player = Player(name="Fast Racer")
    db_session.add(player)
    db_session.flush()

    session = Session(player_id=player.id, track_name="Spa", car_name="GT3")
    db_session.add(session)
    db_session.flush()

    lap1 = Lap(session_id=session.id, lap_number=1, lap_time=130.5)
    lap2 = Lap(session_id=session.id, lap_number=2, lap_time=125.2)
    db_session.add_all([lap1, lap2])
    db_session.commit()

    response = client.get(f"/api/players/{player.id}/best_lap?track_name=Spa")
    assert response.status_code == 200
    data = response.json()
    assert data["lap_time"] == 125.2
    assert data["lap_number"] == 2
