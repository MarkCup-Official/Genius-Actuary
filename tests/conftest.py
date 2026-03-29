from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import AppConfig
from app.main import create_app


class FakeSearchProvider:
    provider_name = "fake-search"

    async def search(self, payload):
        query_plan = payload.suggested_queries or [payload.search_topic]
        results = [
            {
                "title": "Tuition 2026",
                "source_url": "https://example.com/a",
                "source_name": "example.com",
                "fetched_at": "2026-03-29T00:00:00+00:00",
                "summary": "Tuition and housing details.",
                "extracted_facts": ["tuition: mentioned in summary"],
                "confidence": 0.8,
            },
            {
                "title": "Duplicate Tuition 2026",
                "source_url": "https://example.com/a",
                "source_name": "example.com",
                "fetched_at": "2026-03-29T00:00:00+00:00",
                "summary": "Duplicate entry.",
                "extracted_facts": ["duplicate"],
                "confidence": 0.6,
            },
            {
                "title": "Visa Policy",
                "source_url": "https://example.com/b",
                "source_name": "example.com",
                "fetched_at": "2026-03-29T00:00:00+00:00",
                "summary": "Visa policy summary.",
                "extracted_facts": ["visa: mentioned in summary"],
                "confidence": 0.75,
            },
        ]
        from app.schemas.search import SearchResultItem

        deduped = []
        seen = set()
        for result in results:
            if result["source_url"] in seen:
                continue
            seen.add(result["source_url"])
            deduped.append(SearchResultItem(**result))
        return query_plan, deduped[: payload.max_results], {"provider_name": self.provider_name}


class FakeCalculationProvider:
    provider_name = "fake-calc"

    async def calculate(self, task_id, payload):
        if payload.task_type == "break_even":
            numerator = payload.variables["fixed_cost"]
            denominator = payload.variables["unit_price"] - payload.variables["unit_cost"]
            output = {"break_even_units": numerator / denominator}
        elif payload.task_type == "function_intersection":
            output = {"intersection_points": [2.0]}
        else:
            expression = payload.expression or "0"
            output = {"evaluated_expression": expression, "value": 3.0}
        return {
            "provider_name": self.provider_name,
            "outputs": output,
            "trace_id": task_id,
        }


@pytest.fixture
def app_config(tmp_path: Path) -> AppConfig:
    return AppConfig(
        database_path=tmp_path / "test.db",
        brave_api_key="test-key",
        calculation_mcp_endpoint="http://example.com/mcp",
    )


@pytest.fixture
def client(app_config: AppConfig) -> TestClient:
    app = create_app(
        app_config,
        search_provider=FakeSearchProvider(),
        calculation_provider=FakeCalculationProvider(),
    )
    with TestClient(app) as test_client:
        yield test_client
