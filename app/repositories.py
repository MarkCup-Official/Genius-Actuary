from __future__ import annotations

from app.database import Database, dumps_json, loads_json
from app.schemas.calculation import CalculationTaskResponse
from app.schemas.chart import ChartTaskResponse
from app.schemas.search import SearchTaskResponse


class TaskRepository:
    def __init__(self, db: Database) -> None:
        self.db = db

    def save_search_task(self, response: SearchTaskResponse) -> None:
        with self.db.connect() as connection:
            result_json = dumps_json(response.result.model_dump()) if response.result else None
            connection.execute(
                """
                INSERT OR REPLACE INTO search_tasks (
                    task_id, session_id, module, status, provider_name, request_json,
                    result_json, error_code, error_message, retryable, created_at, finished_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    response.task_id,
                    response.result.request.session_id if response.result else None,
                    response.module,
                    response.status,
                    (
                        response.result.provider_metadata.get("provider_name")
                        if response.result
                        else "unknown"
                    ),
                    dumps_json(response.result.request.model_dump()) if response.result else "{}",
                    result_json,
                    response.error_code,
                    response.error_message,
                    1 if response.retryable else 0,
                    response.created_at,
                    response.finished_at,
                ),
            )
            connection.execute("DELETE FROM search_results WHERE task_id = ?", (response.task_id,))
            if response.result:
                for index, item in enumerate(response.result.results):
                    connection.execute(
                        """
                        INSERT INTO search_results (
                            task_id, result_index, title, source_url, source_name,
                            fetched_at, summary, extracted_facts_json, confidence
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            response.task_id,
                            index,
                            item.title,
                            item.source_url,
                            item.source_name,
                            item.fetched_at,
                            item.summary,
                            dumps_json(item.extracted_facts),
                            item.confidence,
                        ),
                    )

    def get_search_task(self, task_id: str) -> SearchTaskResponse | None:
        with self.db.connect() as connection:
            task = connection.execute(
                "SELECT * FROM search_tasks WHERE task_id = ?",
                (task_id,),
            ).fetchone()
            if task is None:
                return None
            return SearchTaskResponse(
                task_id=task["task_id"],
                module=task["module"],
                status=task["status"],
                created_at=task["created_at"],
                finished_at=task["finished_at"],
                retryable=bool(task["retryable"]),
                error_code=task["error_code"],
                error_message=task["error_message"],
                result=loads_json(task["result_json"], None),
            )

    def save_calculation_task(self, response: CalculationTaskResponse, provider_name: str) -> None:
        with self.db.connect() as connection:
            result_json = dumps_json(response.result.model_dump()) if response.result else None
            request_json = dumps_json(response.result.request.model_dump()) if response.result else "{}"
            session_id = response.result.request.session_id if response.result else None
            connection.execute(
                """
                INSERT OR REPLACE INTO calculation_tasks (
                    task_id, session_id, module, status, provider_name, request_json,
                    result_json, error_code, error_message, retryable, created_at, finished_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    response.task_id,
                    session_id,
                    response.module,
                    response.status,
                    provider_name,
                    request_json,
                    result_json,
                    response.error_code,
                    response.error_message,
                    1 if response.retryable else 0,
                    response.created_at,
                    response.finished_at,
                ),
            )

    def get_calculation_task(self, task_id: str) -> CalculationTaskResponse | None:
        with self.db.connect() as connection:
            task = connection.execute(
                "SELECT * FROM calculation_tasks WHERE task_id = ?",
                (task_id,),
            ).fetchone()
            if task is None:
                return None
            return CalculationTaskResponse(
                task_id=task["task_id"],
                module=task["module"],
                status=task["status"],
                created_at=task["created_at"],
                finished_at=task["finished_at"],
                retryable=bool(task["retryable"]),
                error_code=task["error_code"],
                error_message=task["error_message"],
                result=loads_json(task["result_json"], None),
            )

    def save_chart_task(
        self,
        response: ChartTaskResponse,
        *,
        provider_name: str,
        image_content: bytes | None = None,
        image_mime_type: str | None = None,
    ) -> None:
        with self.db.connect() as connection:
            result_json = dumps_json(response.result.model_dump()) if response.result else None
            request_json = dumps_json(response.result.request.model_dump()) if response.result else "{}"
            chart_spec_json = (
                dumps_json(response.result.chart_spec.model_dump()) if response.result else None
            )
            session_id = response.result.request.session_id if response.result else None
            connection.execute(
                """
                INSERT OR REPLACE INTO chart_tasks (
                    task_id, session_id, module, status, provider_name, request_json,
                    result_json, chart_spec_json, error_code, error_message, retryable,
                    created_at, finished_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    response.task_id,
                    session_id,
                    response.module,
                    response.status,
                    provider_name,
                    request_json,
                    result_json,
                    chart_spec_json,
                    response.error_code,
                    response.error_message,
                    1 if response.retryable else 0,
                    response.created_at,
                    response.finished_at,
                ),
            )
            connection.execute("DELETE FROM chart_artifacts WHERE task_id = ?", (response.task_id,))
            if image_content and image_mime_type:
                connection.execute(
                    """
                    INSERT INTO chart_artifacts (task_id, artifact_kind, mime_type, content)
                    VALUES (?, ?, ?, ?)
                    """,
                    (response.task_id, "image", image_mime_type, image_content),
                )

    def get_chart_task(self, task_id: str) -> ChartTaskResponse | None:
        with self.db.connect() as connection:
            task = connection.execute(
                "SELECT * FROM chart_tasks WHERE task_id = ?",
                (task_id,),
            ).fetchone()
            if task is None:
                return None
            return ChartTaskResponse(
                task_id=task["task_id"],
                module=task["module"],
                status=task["status"],
                created_at=task["created_at"],
                finished_at=task["finished_at"],
                retryable=bool(task["retryable"]),
                error_code=task["error_code"],
                error_message=task["error_message"],
                result=loads_json(task["result_json"], None),
            )

    def get_chart_artifact(self, task_id: str) -> dict[str, bytes | str] | None:
        with self.db.connect() as connection:
            artifact = connection.execute(
                "SELECT * FROM chart_artifacts WHERE task_id = ?",
                (task_id,),
            ).fetchone()
            if artifact is None:
                return None
            return {"mime_type": artifact["mime_type"], "content": artifact["content"]}
