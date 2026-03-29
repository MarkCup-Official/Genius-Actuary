from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.calculation import router as calculation_router
from app.api.routes.chart import router as chart_router
from app.api.routes.search import router as search_router
from app.config import AppConfig
from app.container import AppContainer


def create_app(
    config: AppConfig | None = None,
    *,
    search_provider=None,
    calculation_provider=None,
    chart_provider=None,
) -> FastAPI:
    app_config = config or AppConfig.from_env()
    container = AppContainer.build(
        app_config,
        search_provider=search_provider,
        calculation_provider=calculation_provider,
        chart_provider=chart_provider,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        container.db.init_schema()
        app.state.container = container
        yield

    app = FastAPI(
        title=app_config.app_name,
        version=app_config.app_version,
        lifespan=lifespan,
    )
    app.include_router(search_router)
    app.include_router(calculation_router)
    app.include_router(chart_router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
