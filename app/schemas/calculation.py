from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import TaskEnvelope


class CalculationTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str | None = None
    task_type: str
    expression: str | None = None
    variables: dict[str, float] = Field(default_factory=dict)
    constraints: dict[str, Any] = Field(default_factory=dict)
    units: dict[str, str] = Field(default_factory=dict)
    expected_outputs: list[str] = Field(default_factory=list)


class CalculationTaskResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request: CalculationTaskCreate
    normalized_inputs: dict[str, Any]
    outputs: dict[str, Any]
    provider_trace: dict[str, Any]


class CalculationTaskResponse(TaskEnvelope):
    result: CalculationTaskResult | None = None
