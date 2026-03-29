from __future__ import annotations

from fastapi import status

from app.errors import AppError
from app.schemas.search import SearchTaskCreate, SearchTaskResponse, SearchTaskResult
from app.utils import new_task_id, utc_now_iso


class SearchService:
    def __init__(self, *, provider, repository) -> None:
        self.provider = provider
        self.repository = repository

    async def create_task(self, payload: SearchTaskCreate) -> tuple[int, SearchTaskResponse]:
        task_id = new_task_id()
        created_at = utc_now_iso()
        try:
            if not payload.suggested_queries and not payload.search_topic.strip():
                raise AppError(
                    "search_topic or suggested_queries is required",
                    status_code=422,
                    error_code="invalid_search_task",
                )
            query_plan, results, provider_metadata = await self.provider.search(payload)
            response = SearchTaskResponse(
                task_id=task_id,
                module="search",
                status="completed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=False,
                result=SearchTaskResult(
                    request=payload,
                    query_plan=query_plan,
                    provider_metadata=provider_metadata,
                    results=results,
                ),
            )
            self.repository.save_search_task(response)
            return status.HTTP_200_OK, response
        except AppError as exc:
            response = SearchTaskResponse(
                task_id=task_id,
                module="search",
                status="failed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=exc.retryable,
                error_code=exc.error_code,
                error_message=exc.message,
            )
            self.repository.save_search_task(response)
            return exc.status_code, response
