from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import TaskEnvelope


class SearchTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str | None = None
    search_topic: str
    search_goal: str
    search_scope: dict[str, Any] | None = None
    suggested_queries: list[str] = Field(default_factory=list)
    required_fields: list[str] = Field(default_factory=list)
    freshness_requirement: str | None = None
    max_results: int = Field(default=5, ge=1, le=5)


class SearchResultItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    source_url: str
    source_name: str
    fetched_at: str
    summary: str
    extracted_facts: list[str]
    confidence: float = Field(ge=0, le=1)


class SearchTaskResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request: SearchTaskCreate
    query_plan: list[str]
    provider_metadata: dict[str, Any]
    results: list[SearchResultItem]


class SearchTaskResponse(TaskEnvelope):
    result: SearchTaskResult | None = None
