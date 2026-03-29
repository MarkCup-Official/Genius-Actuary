from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import httpx

from app.config import AppConfig
from app.errors import AppError
from app.schemas.search import SearchResultItem, SearchTaskCreate


class BraveSearchProvider:
    provider_name = "brave-search"

    def __init__(
        self,
        config: AppConfig,
        client_factory: Callable[[], httpx.AsyncClient] | None = None,
    ) -> None:
        self.config = config
        self._client_factory = client_factory or self._default_client_factory

    def _default_client_factory(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.config.brave_timeout_seconds)

    async def search(
        self, payload: SearchTaskCreate
    ) -> tuple[list[str], list[SearchResultItem], dict[str, Any]]:
        if not self.config.brave_api_key:
            raise AppError(
                "BRAVE_API_KEY is not configured",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            )

        query_plan = payload.suggested_queries or [payload.search_topic]
        unique_results: dict[str, SearchResultItem] = {}
        provider_metadata = {
            "provider_name": self.provider_name,
            "endpoint": self.config.brave_base_url,
            "queries_executed": [],
        }
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.config.brave_api_key,
        }

        try:
            async with self._client_factory() as client:
                for query in query_plan:
                    if len(unique_results) >= payload.max_results:
                        break
                    params: dict[str, Any] = {
                        "q": query,
                        "count": min(payload.max_results, 20),
                        "extra_snippets": "true",
                    }
                    if payload.freshness_requirement:
                        params["freshness"] = payload.freshness_requirement
                    response = await client.get(
                        self.config.brave_base_url,
                        headers=headers,
                        params=params,
                    )
                    response.raise_for_status()
                    provider_metadata["queries_executed"].append(
                        {
                            "query": query,
                            "status_code": response.status_code,
                            "freshness": payload.freshness_requirement,
                        }
                    )
                    items = response.json().get("web", {}).get("results", [])
                    for item in items:
                        url = item.get("url")
                        if not url or url in unique_results:
                            continue
                        summary_parts = [item.get("description", "").strip()]
                        summary_parts.extend(
                            snippet.strip() for snippet in item.get("extra_snippets", []) if snippet
                        )
                        summary = " ".join(part for part in summary_parts if part).strip()
                        unique_results[url] = SearchResultItem(
                            title=item.get("title", "Untitled result"),
                            source_url=url,
                            source_name=self._source_name(item, url),
                            fetched_at=datetime.now(UTC).isoformat(),
                            summary=summary or "No summary returned by Brave Search.",
                            extracted_facts=self._extract_facts(
                                title=item.get("title", ""),
                                summary=summary,
                                required_fields=payload.required_fields,
                            ),
                            confidence=self._estimate_confidence(item, summary),
                        )
                        if len(unique_results) >= payload.max_results:
                            break
        except httpx.HTTPStatusError as exc:
            raise AppError(
                f"Brave Search request failed with status {exc.response.status_code}",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise AppError(
                "Brave Search request failed",
                status_code=502,
                error_code="provider_unavailable",
                retryable=True,
            ) from exc

        return query_plan, list(unique_results.values()), provider_metadata

    def _source_name(self, item: dict[str, Any], url: str) -> str:
        profile = item.get("profile") or {}
        if isinstance(profile, dict) and profile.get("long_name"):
            return str(profile["long_name"])
        return httpx.URL(url).host or "unknown"

    def _extract_facts(self, *, title: str, summary: str, required_fields: list[str]) -> list[str]:
        facts: list[str] = []
        if title:
            facts.append(f"title: {title}")
        for field in required_fields:
            if field and field.lower() in summary.lower():
                facts.append(f"{field}: mentioned in summary")
        if not facts and summary:
            facts.append(summary[:180])
        return facts[:5]

    def _estimate_confidence(self, item: dict[str, Any], summary: str) -> float:
        base = 0.55
        if item.get("extra_snippets"):
            base += 0.1
        if item.get("page_age"):
            base += 0.05
        if summary:
            base += 0.1
        return min(base, 0.95)
