from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import TaskEnvelope


RenderMode = Literal["spec", "image", "both"]


class ChartDataset(BaseModel):
    model_config = ConfigDict(extra="forbid")

    labels: list[str]
    values: dict[str, list[float]]

    @field_validator("labels")
    @classmethod
    def labels_must_exist(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("labels cannot be empty")
        return value


class ChartSeriesConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    observed: bool = True
    color: str | None = None


class ChartTaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str | None = None
    chart_type: str
    title: str
    subtitle: str | None = None
    dataset: ChartDataset
    series: list[ChartSeriesConfig]
    axes: dict[str, Any] = Field(default_factory=dict)
    units: dict[str, str] = Field(default_factory=dict)
    source_refs: list[str] = Field(default_factory=list)
    render_mode: RenderMode = "spec"


class ChartSeriesSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    values: list[float]
    color: str | None = None


class ChartSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chart_type: str
    title: str
    subtitle: str | None = None
    labels: list[str]
    series: list[ChartSeriesSpec]
    axes: dict[str, Any]
    legend: dict[str, Any]
    annotations: list[str]
    provenance: dict[str, Any]
    estimated_vs_observed: dict[str, Any]


class ChartTaskResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request: ChartTaskCreate
    chart_spec: ChartSpec
    image_available: bool
    image_mime_type: str | None = None


class ChartTaskResponse(TaskEnvelope):
    result: ChartTaskResult | None = None
