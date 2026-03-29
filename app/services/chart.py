from __future__ import annotations

from fastapi import status

from app.errors import AppError
from app.schemas.chart import (
    ChartSeriesSpec,
    ChartSpec,
    ChartTaskCreate,
    ChartTaskResponse,
    ChartTaskResult,
)
from app.utils import new_task_id, utc_now_iso


SUPPORTED_CHART_TYPES = {"bar", "line", "radar"}


class ChartService:
    def __init__(self, *, provider, repository) -> None:
        self.provider = provider
        self.repository = repository

    async def create_task(self, payload: ChartTaskCreate) -> tuple[int, ChartTaskResponse]:
        task_id = new_task_id()
        created_at = utc_now_iso()
        provider_name = getattr(self.provider, "provider_name", "unknown")

        try:
            spec = self._build_spec(payload)
            image_content = None
            image_mime_type = None
            if payload.render_mode in {"image", "both"}:
                image_content, image_mime_type = self.provider.render(spec)
            response = ChartTaskResponse(
                task_id=task_id,
                module="chart",
                status="completed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=False,
                result=ChartTaskResult(
                    request=payload,
                    chart_spec=spec,
                    image_available=image_content is not None,
                    image_mime_type=image_mime_type,
                ),
            )
            self.repository.save_chart_task(
                response,
                provider_name=provider_name,
                image_content=image_content,
                image_mime_type=image_mime_type,
            )
            return status.HTTP_200_OK, response
        except AppError as exc:
            response = ChartTaskResponse(
                task_id=task_id,
                module="chart",
                status="failed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=exc.retryable,
                error_code=exc.error_code,
                error_message=exc.message,
            )
            self.repository.save_chart_task(response, provider_name=provider_name)
            return exc.status_code, response

    def _build_spec(self, payload: ChartTaskCreate) -> ChartSpec:
        if payload.chart_type not in SUPPORTED_CHART_TYPES:
            raise AppError(
                f"Unsupported chart_type: {payload.chart_type}",
                status_code=422,
                error_code="unsupported_chart_type",
            )
        if not payload.series:
            raise AppError(
                "At least one series is required",
                status_code=422,
                error_code="missing_series",
            )

        labels = payload.dataset.labels
        spec_series: list[ChartSeriesSpec] = []
        estimated: dict[str, bool] = {}
        for series in payload.series:
            values = payload.dataset.values.get(series.key)
            if values is None:
                raise AppError(
                    f"Missing dataset values for series '{series.key}'",
                    status_code=422,
                    error_code="missing_dataset_values",
                )
            if len(values) != len(labels):
                raise AppError(
                    f"Series '{series.key}' length does not match labels length",
                    status_code=422,
                    error_code="insufficient_chart_data",
                )
            spec_series.append(
                ChartSeriesSpec(
                    key=series.key,
                    label=series.label,
                    values=values,
                    color=series.color,
                )
            )
            estimated[series.key] = not series.observed

        annotations: list[str] = []
        if payload.source_refs:
            annotations.append("Sources: " + ", ".join(payload.source_refs))
        annotations.append("Observed and estimated values are tracked per series.")

        return ChartSpec(
            chart_type=payload.chart_type,
            title=payload.title,
            subtitle=payload.subtitle,
            labels=labels,
            series=spec_series,
            axes=payload.axes,
            legend={"enabled": True, "position": "top"},
            annotations=annotations,
            provenance={"source_refs": payload.source_refs, "units": payload.units},
            estimated_vs_observed=estimated,
        )
