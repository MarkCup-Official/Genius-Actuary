from __future__ import annotations

from dataclasses import dataclass

from app.config import AppConfig
from app.database import Database
from app.providers.calculation import CalculationMCPProvider
from app.providers.chart import MatplotlibChartProvider
from app.providers.search import BraveSearchProvider
from app.repositories import TaskRepository
from app.services.calculation import CalculationService
from app.services.chart import ChartService
from app.services.search import SearchService


@dataclass
class AppContainer:
    config: AppConfig
    db: Database
    repository: TaskRepository
    search_service: SearchService
    calculation_service: CalculationService
    chart_service: ChartService

    @classmethod
    def build(
        cls,
        config: AppConfig,
        *,
        search_provider=None,
        calculation_provider=None,
        chart_provider=None,
    ) -> "AppContainer":
        db = Database(config.database_path)
        repository = TaskRepository(db)
        return cls(
            config=config,
            db=db,
            repository=repository,
            search_service=SearchService(
                provider=search_provider or BraveSearchProvider(config),
                repository=repository,
            ),
            calculation_service=CalculationService(
                provider=calculation_provider or CalculationMCPProvider(config),
                repository=repository,
            ),
            chart_service=ChartService(
                provider=chart_provider or MatplotlibChartProvider(config),
                repository=repository,
            ),
        )
