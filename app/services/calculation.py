from __future__ import annotations

from typing import Any

from fastapi import status
from sympy import Eq, solve, sympify

from app.errors import AppError
from app.schemas.calculation import (
    CalculationTaskCreate,
    CalculationTaskResponse,
    CalculationTaskResult,
)
from app.utils import new_task_id, utc_now_iso


SUPPORTED_TASK_TYPES = {
    "arithmetic",
    "formula_eval",
    "break_even",
    "function_intersection",
}


class CalculationService:
    def __init__(self, *, provider, repository) -> None:
        self.provider = provider
        self.repository = repository

    async def create_task(self, payload: CalculationTaskCreate) -> tuple[int, CalculationTaskResponse]:
        task_id = new_task_id()
        created_at = utc_now_iso()
        provider_name = getattr(self.provider, "provider_name", "unknown")

        try:
            normalized_inputs = self._validate_and_normalize(payload)
            provider_result = await self.provider.calculate(task_id, payload)
            outputs = provider_result.get("outputs") or provider_result.get("result")
            if outputs is None:
                raise AppError(
                    "Calculation provider returned no outputs",
                    status_code=502,
                    error_code="provider_unavailable",
                    retryable=True,
                )
            response = CalculationTaskResponse(
                task_id=task_id,
                module="calculation",
                status="completed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=False,
                result=CalculationTaskResult(
                    request=payload,
                    normalized_inputs=normalized_inputs,
                    outputs=outputs,
                    provider_trace={
                        "provider_name": provider_result.get("provider_name", provider_name),
                        "raw": provider_result,
                    },
                ),
            )
            self.repository.save_calculation_task(
                response,
                provider_name=provider_result.get("provider_name", provider_name),
            )
            return status.HTTP_200_OK, response
        except AppError as exc:
            response = CalculationTaskResponse(
                task_id=task_id,
                module="calculation",
                status="failed",
                created_at=created_at,
                finished_at=utc_now_iso(),
                retryable=exc.retryable,
                error_code=exc.error_code,
                error_message=exc.message,
            )
            self.repository.save_calculation_task(response, provider_name=provider_name)
            return exc.status_code, response

    def _validate_and_normalize(self, payload: CalculationTaskCreate) -> dict[str, Any]:
        if payload.task_type not in SUPPORTED_TASK_TYPES:
            raise AppError(
                f"Unsupported task_type: {payload.task_type}",
                status_code=422,
                error_code="unsupported_task_type",
            )

        if payload.task_type in {"arithmetic", "formula_eval"}:
            if not payload.expression:
                raise AppError(
                    "expression is required",
                    status_code=422,
                    error_code="missing_expression",
                )
            expression = sympify(payload.expression)
            normalized = {"expression": str(expression), "variables": payload.variables}
            if payload.variables:
                normalized["preview"] = float(expression.evalf(subs=payload.variables))
            return normalized

        if payload.task_type == "break_even":
            required = {"fixed_cost", "unit_price", "unit_cost"}
            missing = sorted(required - payload.variables.keys())
            if missing:
                raise AppError(
                    f"Missing variables for break_even: {', '.join(missing)}",
                    status_code=422,
                    error_code="missing_variables",
                )
            denominator = payload.variables["unit_price"] - payload.variables["unit_cost"]
            if denominator <= 0:
                raise AppError(
                    "unit_price must be greater than unit_cost",
                    status_code=422,
                    error_code="invalid_break_even_inputs",
                )
            return {
                "formula": "fixed_cost / (unit_price - unit_cost)",
                "preview": payload.variables["fixed_cost"] / denominator,
                "variables": payload.variables,
            }

        left_expression = payload.constraints.get("left_expression")
        right_expression = payload.constraints.get("right_expression")
        symbol = str(payload.constraints.get("symbol", "x"))
        if not left_expression or not right_expression:
            raise AppError(
                "left_expression and right_expression are required",
                status_code=422,
                error_code="missing_constraints",
            )
        left = sympify(str(left_expression))
        right = sympify(str(right_expression))
        solutions = solve(Eq(left, right))
        return {
            "left_expression": str(left),
            "right_expression": str(right),
            "symbol": symbol,
            "preview": [str(solution) for solution in solutions],
        }
