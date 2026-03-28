from dataclasses import dataclass
from pathlib import Path

from app.adapters.chart import MockChartAdapter
from app.adapters.llm_analysis import MockAnalysisAdapter
from app.adapters.search import MockSearchAdapter
from app.orchestrator.engine import AnalysisOrchestrator
from app.persistence.sqlite import SQLiteSessionRepository
from app.services.sessions import SessionService


@dataclass
class AppServices:
    session_service: SessionService
    orchestrator: AnalysisOrchestrator


_services: AppServices | None = None


def get_app_services() -> AppServices:
    global _services
    if _services is None:
        db_path = Path(__file__).resolve().parents[1] / "data" / "genius_actuary.db"
        repository = SQLiteSessionRepository(str(db_path))
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
