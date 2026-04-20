import sqlite3
import json
import os
from datetime import datetime
from typing import Optional

DB_PATH = os.getenv("DB_PATH", "lumi.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        );
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT,
            session_id TEXT,
            rating INTEGER,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS uploaded_files (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            filename TEXT,
            content TEXT,
            size INTEGER,
            created_at TEXT
        );
        """)


def upsert_session(session_id: str, title: Optional[str] = None):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM sessions WHERE id=?", (session_id,)).fetchone()
        if existing:
            conn.execute("UPDATE sessions SET updated_at=? WHERE id=?", (now, session_id))
        else:
            conn.execute(
                "INSERT INTO sessions(id,title,created_at,updated_at) VALUES(?,?,?,?)",
                (session_id, title or "New conversation", now, now)
            )


def save_message(msg_id: str, session_id: str, role: str, content: str):
    now = datetime.utcnow().isoformat()
    upsert_session(session_id)
    with get_conn() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO messages(id,session_id,role,content,created_at) VALUES(?,?,?,?,?)",
            (msg_id, session_id, role, content, now)
        )
        # Update session title from first user message
        if role == "user":
            title = content[:60] + ("…" if len(content) > 60 else "")
            conn.execute(
                "UPDATE sessions SET title=?, updated_at=? WHERE id=? AND title='New conversation'",
                (title, now, session_id)
            )


def get_messages(session_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC",
            (session_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def get_sessions() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT 50"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_session(session_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM messages WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE id=?", (session_id,))
        conn.execute("DELETE FROM uploaded_files WHERE session_id=?", (session_id,))


def save_feedback(message_id: str, session_id: str, rating: int):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO feedback(message_id,session_id,rating,created_at) VALUES(?,?,?,?)",
            (message_id, session_id, rating, now)
        )


def save_file_to_db(file_id: str, session_id: str, filename: str, content: str, size: int):
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO uploaded_files(id,session_id,filename,content,size,created_at) VALUES(?,?,?,?,?,?)",
            (file_id, session_id, filename, content, size, now)
        )


def get_session_files(session_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, filename, size FROM uploaded_files WHERE session_id=?",
            (session_id,)
        ).fetchall()
    return [dict(r) for r in rows]