from __future__ import annotations

import asyncio

import httpx

from app.config import AppConfig
from app.providers.search import BraveSearchProvider


def test_search_task_success_and_get(client):
    payload = {
        "session_id": "session-1",
        "search_topic": "Japan exchange cost",
        "search_goal": "find tuition and visa data",
        "search_scope": {"country": "JP"},
        "suggested_queries": ["Japan exchange tuition 2026", "Japan student visa 2026"],
        "required_fields": ["tuition", "visa"],
        "freshness_requirement": "pw",
        "max_results": 5,
    }
    response = client.post("/api/v1/search/tasks", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["result"]["provider_metadata"]["provider_name"] == "fake-search"
    assert len(body["result"]["results"]) == 2

    follow_up = client.get(f"/api/v1/search/tasks/{body['task_id']}")
    assert follow_up.status_code == 200
    assert follow_up.json()["task_id"] == body["task_id"]


def test_brave_provider_sets_auth_header_and_freshness():
    seen = {}

    def factory():
        def handler(request: httpx.Request) -> httpx.Response:
            seen["headers"] = dict(request.headers)
            seen["url"] = str(request.url)
            return httpx.Response(
                200,
                json={
                    "web": {
                        "results": [
                            {
                                "title": "Sample",
                                "url": "https://example.com/x",
                                "description": "Fresh result",
                                "extra_snippets": ["More context"],
                            }
                        ]
                    }
                },
            )

        return httpx.AsyncClient(transport=httpx.MockTransport(handler))

    provider = BraveSearchProvider(AppConfig(brave_api_key="abc123"), client_factory=factory)

    from app.schemas.search import SearchTaskCreate

    query_plan, results, metadata = asyncio.run(
        provider.search(
            SearchTaskCreate(
                search_topic="topic",
                search_goal="goal",
                suggested_queries=["query"],
                required_fields=[],
                freshness_requirement="pw",
                max_results=3,
            )
        )
    )
    assert query_plan == ["query"]
    assert len(results) == 1
    assert seen["headers"]["x-subscription-token"] == "abc123"
    assert "freshness=pw" in seen["url"]
    assert metadata["provider_name"] == "brave-search"
