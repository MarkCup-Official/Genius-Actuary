from __future__ import annotations

from typing import Protocol

from app.domain.models import AnalysisSession


class SessionRepository(Protocol):
    def save(self, session: AnalysisSession) -> AnalysisSession:
        ...

    def get(self, session_id: str) -> AnalysisSession | None:
        ...
