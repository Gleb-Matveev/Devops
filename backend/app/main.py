import os
import socket
from contextlib import asynccontextmanager, contextmanager

import psycopg2
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field

APP_VERSION = os.getenv("APP_VERSION", "dev")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "notes"),
    "user": os.getenv("DB_USER", "notes"),
    "password": os.getenv("DB_PASSWORD", "notes"),
    "connect_timeout": 3,
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

_schema_ready = False


@contextmanager
def db_cursor():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        with conn, conn.cursor() as cur:
            yield cur
    finally:
        conn.close()


def init_db():
    global _schema_ready
    if _schema_ready:
        return
    with db_cursor() as cur:
        cur.execute(SCHEMA)
    _schema_ready = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except psycopg2.Error as e:
        print(f"DB is not available on startup: {e}")
    yield


app = FastAPI(title="Notes API", version=APP_VERSION, lifespan=lifespan)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


@app.exception_handler(psycopg2.OperationalError)
def db_unavailable(request: Request, exc: psycopg2.OperationalError):
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/ready")
def ready():
    try:
        with db_cursor() as cur:
            cur.execute("SELECT 1")
        return {"status": "ready", "db": "ok"}
    except psycopg2.Error as e:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "db": str(e).strip()},
        )


@app.get("/api/info")
def info():
    return {"version": APP_VERSION, "hostname": socket.gethostname()}


@app.get("/api/notes")
def list_notes():
    init_db()
    with db_cursor() as cur:
        cur.execute("SELECT id, text, created_at FROM notes ORDER BY id DESC")
        rows = cur.fetchall()
    return [
        {"id": r[0], "text": r[1], "created_at": r[2].isoformat()} for r in rows
    ]


@app.post("/api/notes", status_code=201)
def create_note(note: NoteIn):
    init_db()
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO notes (text) VALUES (%s) RETURNING id, created_at",
            (note.text,),
        )
        note_id, created_at = cur.fetchone()
    return {"id": note_id, "text": note.text, "created_at": created_at.isoformat()}


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    with db_cursor() as cur:
        cur.execute("DELETE FROM notes WHERE id = %s", (note_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Note not found")
