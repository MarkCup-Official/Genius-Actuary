from __future__ import annotations

import sqlite3
from pathlib import Path

from app.domain.models import AnalysisSession
from app.persistence.base import SessionRepository


class SQLiteSessionRepository(SessionRepository):
    def __init__(self, db_path: str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    owner_client_id TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sessions_owner_updated
                ON sessions (owner_client_id, updated_at DESC)
                """
            )
            connection.commit()

    def save(self, session: AnalysisSession) -> AnalysisSession:
        session.touch()
        payload_json = session.model_dump_json()

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO sessions (
                    session_id,
                    owner_client_id,
                    mode,
                    status,
                    created_at,
                    updated_at,
                    payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    owner_client_id = excluded.owner_client_id,
                    mode = excluded.mode,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at,
                    payload_json = excluded.payload_json
                """,
                (
                    session.session_id,
                    session.owner_client_id,
                    session.mode.value,
                    session.status.value,
                    session.created_at.isoformat(),
                    session.updated_at.isoformat(),
                    payload_json,
                ),
            )
            connection.commit()

        return AnalysisSession.model_validate_json(payload_json)

    def get(self, session_id: str) -> AnalysisSession | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT payload_json
                FROM sessions
                WHERE session_id = ?
                """,
                (session_id,),
            ).fetchone()

        if row is None:
            return None
        return AnalysisSession.model_validate_json(row["payload_json"])
