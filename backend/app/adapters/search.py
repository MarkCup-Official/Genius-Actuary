from __future__ import annotations

from typing import Any

import httpx

from app.domain.models import EvidenceItem, SearchTask


class MockSearchAdapter:
    def run(self, tasks: list[SearchTask]) -> list[EvidenceItem]:
        evidence: list[EvidenceItem] = []
        for task in tasks:
            evidence.append(
                EvidenceItem(
                    title=f"Mock result for {task.search_topic}",
                    source_url="https://example.com/mock-search",
                    source_name="MockSearch",
                    summary=f"Placeholder evidence generated for query planning: {task.search_goal}",
                    extracted_facts=[
                        "This is a mock evidence item.",
                        "Replace this adapter with a real MCP or external API integration.",
                    ],
                    confidence=0.35,
                )
            )
            task.status = "completed"
        return evidence


class BraveSearchAdapter:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        country: str,
        search_language: str,
        ui_language: str,
        result_count: int,
        extra_snippets: bool,
        timeout_seconds: float = 30,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.country = country
        self.search_language = search_language
        self.ui_language = ui_language
        self.result_count = result_count
        self.extra_snippets = extra_snippets
        self.timeout_seconds = timeout_seconds

    def run(self, tasks: list[SearchTask]) -> list[EvidenceItem]:
        evidence: list[EvidenceItem] = []
        for task in tasks:
            query = self._pick_query(task)
            response_items = self._search(query, task)
            evidence.extend(response_items)
            task.status = "completed"
        return evidence

    def _pick_query(self, task: SearchTask) -> str:
        for query in task.suggested_queries:
            query = query.strip()
            if query:
                return query
        return task.search_goal.strip() or task.search_topic.strip()

    def _search(self, query: str, task: SearchTask) -> list[EvidenceItem]:
        response = httpx.get(
            self.base_url,
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": self.api_key,
            },
            params={
                "q": query,
                "country": self.country,
                "search_lang": self.search_language,
                "ui_lang": self.ui_language,
                "count": self.result_count,
                "extra_snippets": str(self.extra_snippets).lower(),
                "freshness": self._freshness(task.freshness_requirement),
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        web_results = payload.get("web", {}).get("results", [])
        if not isinstance(web_results, list):
            return []

        evidence_items: list[EvidenceItem] = []
        for item in web_results[: self.result_count]:
            if not isinstance(item, dict):
                continue

            url = str(item.get("url", "")).strip()
            title = str(item.get("title", "")).strip() or url or task.search_topic
            description = str(item.get("description", "")).strip()
            extra_snippets = self._string_list(item.get("extra_snippets"))
            facts = extra_snippets or ([description] if description else [])
            if not facts:
                facts = [f"Matched Brave result for query: {query}"]

            evidence_items.append(
                EvidenceItem(
                    title=title,
                    source_url=url or "https://search.brave.com/",
                    source_name=str(item.get("profile", {}).get("long_name", "Brave Search")).strip()
                    or "Brave Search",
                    summary=description or f"Brave search evidence for task: {task.search_goal}",
                    extracted_facts=facts[:5],
                    confidence=0.78,
                )
            )
        return evidence_items

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @staticmethod
    def _freshness(value: str) -> str:
        normalized = value.strip().lower()
        mapping = {
            "high": "pm",
            "recent": "pw",
            "day": "pd",
            "week": "pw",
            "month": "pm",
            "year": "py",
            "pd": "pd",
            "pw": "pw",
            "pm": "pm",
            "py": "py",
        }
        if normalized in mapping:
            return mapping[normalized]
        return ""
