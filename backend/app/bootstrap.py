from dataclasses import dataclass

from app.adapters.chart import MockChartAdapter
from app.adapters.llm_analysis import MockAnalysisAdapter
from app.adapters.search import MockSearchAdapter
from app.orchestrator.engine import AnalysisOrchestrator
from app.persistence.memory import InMemorySessionRepository
from app.services.sessions import SessionService


@dataclass
class AppServices:
    session_service: SessionService
    orchestrator: AnalysisOrchestrator


_services: AppServices | None = None


def get_app_services() -> AppServices:
    global _services
    if _services is None:
        repository = InMemorySessionRepository()
        session_service = SessionService(repository)
        orchestrator = AnalysisOrchestrator(
            repository=repository,
            analysis_adapter=MockAnalysisAdapter(),
            search_adapter=MockSearchAdapter(),
            chart_adapter=MockChartAdapter(),
        )
        _services = AppServices(
            session_service=session_service,
            orchestrator=orchestrator,
        )
    return _services
