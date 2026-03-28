from __future__ import annotations

from typing import Protocol

from app.domain.models import AnalysisSession, AuditLogEntry


class SessionRepository(Protocol):
    def save(self, session: AnalysisSession) -> AnalysisSession:
        ...

    def get(self, session_id: str) -> AnalysisSession | None:
        ...

    def list_sessions(self) -> list[AnalysisSession]:
        ...

    def list_sessions_by_owner(self, owner_client_id: str) -> list[AnalysisSession]:
        ...

    def delete_sessions_by_owner(self, owner_client_id: str) -> int:
        ...

    def save_audit_log(self, entry: AuditLogEntry) -> AuditLogEntry:
        ...

    def list_audit_logs(self, limit: int = 200) -> list[AuditLogEntry]:
        ...

    def get_audit_log(self, log_id: str) -> AuditLogEntry | None:
        ...
