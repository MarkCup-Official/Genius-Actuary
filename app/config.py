from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    app_name: str = "Genius Actuary MVP Backend"
    app_version: str = "0.1.0"
    database_path: Path = Path("data/genius_actuary.db")
    brave_api_key: str | None = None
    brave_base_url: str = "https://api.search.brave.com/res/v1/web/search"
    brave_timeout_seconds: float = 15.0
    calculation_mcp_endpoint: str | None = None
    calculation_mcp_timeout_seconds: float = 20.0
    chart_image_format: str = "png"

    @classmethod
    def from_env(cls) -> "AppConfig":
        database_path = Path(os.getenv("APP_DB_PATH", "data/genius_actuary.db"))
        return cls(
            database_path=database_path,
            brave_api_key=os.getenv("BRAVE_API_KEY"),
            brave_base_url=os.getenv(
                "BRAVE_BASE_URL",
                "https://api.search.brave.com/res/v1/web/search",
            ),
            brave_timeout_seconds=float(os.getenv("BRAVE_TIMEOUT_SECONDS", "15")),
            calculation_mcp_endpoint=os.getenv("CALCULATION_MCP_ENDPOINT"),
            calculation_mcp_timeout_seconds=float(
                os.getenv("CALCULATION_MCP_TIMEOUT_SECONDS", "20")
            ),
            chart_image_format=os.getenv("CHART_IMAGE_FORMAT", "png").lower(),
        )
