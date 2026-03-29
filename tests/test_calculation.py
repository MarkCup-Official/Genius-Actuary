from __future__ import annotations

import asyncio

import httpx

from app.providers.mcp import MCPToolClient


def test_calculation_break_even_success(client):
    payload = {
        "session_id": "session-1",
        "task_type": "break_even",
        "variables": {
            "fixed_cost": 1000,
            "unit_price": 50,
            "unit_cost": 30,
        },
    }
    response = client.post("/api/v1/calculations/tasks", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["result"]["outputs"]["break_even_units"] == 50

    follow_up = client.get(f"/api/v1/calculations/tasks/{body['task_id']}")
    assert follow_up.status_code == 200


def test_calculation_unsupported_task_persisted(client):
    response = client.post(
        "/api/v1/calculations/tasks",
        json={"session_id": "session-1", "task_type": "unknown"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error_code"] == "unsupported_task_type"

    follow_up = client.get(f"/api/v1/calculations/tasks/{body['task_id']}")
    assert follow_up.status_code == 200
    assert follow_up.json()["status"] == "failed"


def test_mcp_tool_client_parses_structured_content():
    def factory():
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                json={
                    "jsonrpc": "2.0",
                    "id": "1",
                    "result": {
                        "structuredContent": {
                            "provider_name": "calc-mcp",
                            "outputs": {"value": 42},
                        }
                    },
                },
            )

        return httpx.AsyncClient(transport=httpx.MockTransport(handler))

    client = MCPToolClient(
        endpoint="http://example.com/mcp",
        timeout_seconds=5,
        client_factory=factory,
    )
    result = asyncio.run(
        client.call_tool(
            request_id="1",
            tool_name="calculate",
            arguments={"task_type": "formula_eval"},
        )
    )
    assert result["outputs"]["value"] == 42
