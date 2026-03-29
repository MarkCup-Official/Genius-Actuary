from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def init_schema(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS search_tasks (
                    task_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    module TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provider_name TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    result_json TEXT,
                    error_code TEXT,
                    error_message TEXT,
                    retryable INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    finished_at TEXT
                );

                CREATE TABLE IF NOT EXISTS search_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT NOT NULL,
                    result_index INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    source_url TEXT NOT NULL,
                    source_name TEXT NOT NULL,
                    fetched_at TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    extracted_facts_json TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES search_tasks(task_id)
                );

                CREATE TABLE IF NOT EXISTS calculation_tasks (
                    task_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    module TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provider_name TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    result_json TEXT,
                    error_code TEXT,
                    error_message TEXT,
                    retryable INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    finished_at TEXT
                );

                CREATE TABLE IF NOT EXISTS chart_tasks (
                    task_id TEXT PRIMARY KEY,
                    session_id TEXT,
                    module TEXT NOT NULL,
                    status TEXT NOT NULL,
                    provider_name TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    result_json TEXT,
                    chart_spec_json TEXT,
                    error_code TEXT,
                    error_message TEXT,
                    retryable INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    finished_at TEXT
                );

                CREATE TABLE IF NOT EXISTS chart_artifacts (
                    task_id TEXT PRIMARY KEY,
                    artifact_kind TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    content BLOB NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES chart_tasks(task_id)
                );
                """
            )


def dumps_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False)


def loads_json(payload: str | None, default: Any) -> Any:
    if not payload:
        return default
    return json.loads(payload)
