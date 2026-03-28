from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

DEMO_ORIGINS = [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Genius Actuary API",
        version="0.1.0",
        description="MVP backend skeleton for the Genius Actuary orchestrator.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=DEMO_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


app = create_app()
