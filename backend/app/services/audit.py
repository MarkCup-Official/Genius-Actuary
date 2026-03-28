from __future__ import annotations

from app.domain.models import AuditLogEntry
from app.persistence.base import SessionRepository


class AuditLogService:
    def __init__(self, repository: SessionRepository) -> None:
        self.repository = repository

    def write(
        self,
        *,
        action: str,
        actor: str,
        target: str,
        ip_address: str,
        summary: str,
        status: str = "success",
        metadata: dict[str, str] | None = None,
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            action=action,
            actor=actor,
            target=target,
            ip_address=ip_address,
            summary=summary,
            status=status,
            metadata=metadata or {},
        )
        return self.repository.save_audit_log(entry)

    def list_logs(self, limit: int = 200) -> list[AuditLogEntry]:
        return self.repository.list_audit_logs(limit)

    def get_log(self, log_id: str) -> AuditLogEntry | None:
        return self.repository.get_audit_log(log_id)
