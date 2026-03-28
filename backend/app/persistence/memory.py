from __future__ import annotations

from copy import deepcopy

from app.domain.models import AnalysisSession


class InMemorySessionRepository:
    def __init__(self) -> None:
        self._sessions: dict[str, AnalysisSession] = {}

    def save(self, session: AnalysisSession) -> AnalysisSession:
        session.touch()
        self._sessions[session.session_id] = deepcopy(session)
        return deepcopy(session)

    def get(self, session_id: str) -> AnalysisSession | None:
        session = self._sessions.get(session_id)
        return deepcopy(session) if session else None
