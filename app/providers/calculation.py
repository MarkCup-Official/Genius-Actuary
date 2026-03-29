from __future__ import annotations

from typing import Any

from app.config import AppConfig
from app.providers.mcp import MCPToolClient
from app.schemas.calculation import CalculationTaskCreate


class CalculationMCPProvider:
    provider_name = "calculation-mcp"

    def __init__(self, config: AppConfig, client: MCPToolClient | None = None) -> None:
        self.client = client or MCPToolClient(
            endpoint=config.calculation_mcp_endpoint,
            timeout_seconds=config.calculation_mcp_timeout_seconds,
        )

    async def calculate(self, task_id: str, payload: CalculationTaskCreate) -> dict[str, Any]:
        response = await self.client.call_tool(
            request_id=task_id,
            tool_name="calculate",
            arguments=payload.model_dump(),
        )
        response.setdefault("provider_name", self.provider_name)
        return response
