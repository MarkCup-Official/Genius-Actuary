from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import httpx

from app.errors import AppError


class MCPToolClient:
    def __init__(
        self,
        *,
        endpoint: str | None,
        timeout_seconds: float,
        client_factory: Callable[[], httpx.AsyncClient] | None = None,
    ) -> None:
        self.endpoint = endpoint
        self.timeout_seconds = timeout_seconds
        self._client_factory = client_factory or self._default_client_factory

    def _default_client_factory(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout_seconds)
    
    def build_mcp_payload(
        self,
        *,
        request_id: str,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments,
            },
        } 
    
    def parse_mcp_response(self, data: dict[str, Any]) -> dict[str, Any]:
        if "error" in data:
            raise AppError(
                f"MCP provider returned an error: {data['error']}",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            )

        result = data.get("result", data)

        if isinstance(result, dict) and "structuredContent" in result:
            structured = result["structuredContent"]
            if isinstance(structured, dict):
                return structured

        if isinstance(result, dict) and "content" in result:
            content = result["content"]
            if isinstance(content, list) and content:
                first = content[0]
                if isinstance(first, dict) and first.get("text"):
                    text = first["text"]
                    try:
                        parsed = json.loads(text)
                        if isinstance(parsed, dict):
                            return parsed
                    except json.JSONDecodeError:
                        return {"raw_text": text}

        if isinstance(result, dict):
            return result

        return {"raw_result": result}

    async def call_tool(
            
        self,
        *,
        request_id: str,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        if not self.endpoint:
            raise AppError(
                "Calculation MCP endpoint is not configured",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            )

        payload = self.build_mcp_payload(
            request_id=request_id,
            tool_name=tool_name,
            arguments=arguments,
        )
        try:
            async with self._client_factory() as client:
                response = await client.post(self.endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            raise AppError(
                f"MCP provider failed with status {exc.response.status_code}",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise AppError(
                "MCP provider request failed",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            ) from exc

        return self.parse_mcp_response(data)