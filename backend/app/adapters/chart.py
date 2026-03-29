from __future__ import annotations

from typing import Any

from app.domain.models import AnalysisSession, CalculationTask, ChartArtifact, ChartTask

SUPPORTED_CHART_TYPES = {"bar", "line", "radar", "pie"}


class MockChartAdapter:
    def build_preview(self, session: AnalysisSession) -> list[ChartArtifact]:
        if session.chart_artifacts:
            return []

        for task in session.chart_tasks:
            if task.status == "pending":
                task.status = "completed"
                task.notes = "Completed by the mock chart adapter."

        return [
            ChartArtifact(
                chart_type="bar",
                title="MVP Integration Progress",
                spec={
                    "categories": ["Backend Loop", "Calculation MCP", "Chart MCP"],
                    "series": [
                        {
                            "name": "Progress",
                            "data": [80, 72, 76],
                        }
                    ],
                    "unit": "percent",
                },
                notes="Mock chart artifact for frontend integration.",
            )
        ]


class DisabledChartAdapter:
    def build_preview(self, session: AnalysisSession) -> list[ChartArtifact]:
        for task in session.chart_tasks:
            if task.status == "pending":
                task.status = "failed"
                task.notes = "Chart MCP is disabled in the current backend settings."
        return []


class StructuredChartAdapter:
    def build_preview(self, session: AnalysisSession) -> list[ChartArtifact]:
        pending_tasks = [task for task in session.chart_tasks if task.status == "pending"]
        if not pending_tasks:
            return []

        artifacts: list[ChartArtifact] = []
        for task in pending_tasks:
            artifact = self._build_artifact(task, session)
            if artifact is None:
                task.status = "failed"
                if not task.notes:
                    task.notes = "Insufficient numeric data to generate the requested chart."
                continue

            task.status = "completed"
            artifacts.append(artifact)

        return artifacts

    def _build_artifact(
        self,
        task: ChartTask,
        session: AnalysisSession,
    ) -> ChartArtifact | None:
        chart_type = self._normalize_chart_type(task.chart_type)
        categories, values = self._collect_numeric_dataset(task, session)
        if len(categories) < 2 or len(values) < 2:
            task.notes = "At least two numeric data points are required to render a chart."
            return None

        unit = task.preferred_unit or self._pick_unit(task, session)
        note = task.notes or f"Generated from {len(values)} numeric point(s) in completed calculation tasks."

        if chart_type == "radar":
            return ChartArtifact(
                chart_type="radar",
                title=task.title,
                spec={
                    "radar_indicators": categories,
                    "series": [
                        {
                            "name": task.title,
                            "data": self._normalize_radar_values(values),
                        }
                    ],
                    "unit": unit,
                },
                notes=f"{note} Radar values are normalized to a 0-10 scale.",
            )

        return ChartArtifact(
            chart_type=chart_type,
            title=task.title,
            spec={
                "categories": categories,
                "series": [
                    {
                        "name": task.title,
                        "data": values,
                    }
                ],
                "unit": unit,
            },
            notes=note,
        )

    def _collect_numeric_dataset(
        self,
        chart_task: ChartTask,
        session: AnalysisSession,
    ) -> tuple[list[str], list[float]]:
        completed_tasks = self._completed_calculation_tasks(chart_task, session)

        scalar_results = [
            (task.objective, task.result_value)
            for task in completed_tasks
            if task.result_value is not None
        ]
        if len(scalar_results) >= 2:
            labels = [label for label, _ in scalar_results]
            values = [float(value) for _, value in scalar_results]
            return labels, values

        if completed_tasks:
            labels, values = self._dataset_from_single_task(completed_tasks[0])
            if len(labels) >= 2 and len(values) >= 2:
                return labels, values

        return [], []

    def _completed_calculation_tasks(
        self,
        chart_task: ChartTask,
        session: AnalysisSession,
    ) -> list[CalculationTask]:
        selected_ids = {task_id for task_id in chart_task.source_task_ids if task_id}
        completed = [
            task
            for task in session.calculation_tasks
            if task.status == "completed"
        ]
        if not selected_ids:
            return completed
        return [task for task in completed if task.task_id in selected_ids]

    def _dataset_from_single_task(
        self,
        task: CalculationTask,
    ) -> tuple[list[str], list[float]]:
        result_payload = task.result_payload if isinstance(task.result_payload, dict) else {}
        payload_labels = result_payload.get("labels")
        payload_values = result_payload.get("values")
        if isinstance(payload_labels, list) and isinstance(payload_values, list):
            labels = [str(label).strip() for label in payload_labels if str(label).strip()]
            values = [self._coerce_number(value) for value in payload_values]
            compact_values = [value for value in values if value is not None]
            if labels and len(labels) == len(values) and len(compact_values) == len(values):
                return labels, [float(value) for value in compact_values]

        numeric_inputs = [
            (str(key).strip(), self._coerce_number(value))
            for key, value in task.input_params.items()
        ]
        filtered_inputs = [
            (label, float(value))
            for label, value in numeric_inputs
            if label and value is not None
        ]
        if len(filtered_inputs) >= 2:
            return (
                [label for label, _ in filtered_inputs],
                [value for _, value in filtered_inputs],
            )

        return [], []

    @staticmethod
    def _pick_unit(chart_task: ChartTask, session: AnalysisSession) -> str:
        if chart_task.preferred_unit:
            return chart_task.preferred_unit

        for task in session.calculation_tasks:
            if task.status == "completed" and task.unit:
                return task.unit
        return ""

    @staticmethod
    def _normalize_chart_type(value: str) -> str:
        normalized = value.strip().lower()
        if normalized in SUPPORTED_CHART_TYPES:
            return normalized
        return "bar"

    @staticmethod
    def _normalize_radar_values(values: list[float]) -> list[float]:
        positive_values = [abs(value) for value in values]
        scale = max(positive_values) if positive_values else 1.0
        if scale <= 0:
            scale = 1.0
        return [round(abs(value) / scale * 10, 4) for value in values]

    @staticmethod
    def _coerce_number(value: Any) -> float | None:
        if isinstance(value, bool):
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            normalized = value.strip().replace(",", "")
            if not normalized:
                return None
            try:
                return float(normalized)
            except ValueError:
                return None
        return None
