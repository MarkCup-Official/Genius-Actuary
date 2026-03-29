from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


TaskModule = Literal["search", "calculation", "chart"]
TaskStatus = Literal["completed", "failed"]


class TaskEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: str
    module: TaskModule
    status: TaskStatus
    created_at: str
    finished_at: str | None = None
    retryable: bool = False
    error_code: str | None = None
    error_message: str | None = None
    result: Any = Field(default=None)
