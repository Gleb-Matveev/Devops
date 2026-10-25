import psycopg2
import pytest
from fastapi.testclient import TestClient

from app.main import DB_CONFIG, app

client = TestClient(app)


def db_available() -> bool:
    try:
        psycopg2.connect(**DB_CONFIG).close()
        return True
    except psycopg2.Error:
        return False


needs_db = pytest.mark.skipif(not db_available(), reason="PostgreSQL is not available")


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_info():
    r = client.get("/api/info")
    assert r.status_code == 200
    body = r.json()
    assert "version" in body and "hostname" in body


def test_metrics():
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "http_request" in r.text


def test_empty_note_rejected():
    r = client.post("/api/notes", json={"text": ""})
    assert r.status_code == 422


@needs_db
def test_ready():
    r = client.get("/api/ready")
    assert r.status_code == 200


@needs_db
def test_notes_crud():
    r = client.post("/api/notes", json={"text": "hello from tests"})
    assert r.status_code == 201
    note_id = r.json()["id"]

    r = client.get("/api/notes")
    assert r.status_code == 200
    assert any(n["id"] == note_id for n in r.json())

    r = client.delete(f"/api/notes/{note_id}")
    assert r.status_code == 204

    r = client.delete(f"/api/notes/{note_id}")
    assert r.status_code == 404
