from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.calculation import CalculationTaskCreate, CalculationTaskResponse

router = APIRouter(prefix="/api/v1/calculations", tags=["calculations"])


@router.post("/tasks", response_model=CalculationTaskResponse)
async def create_calculation_task(
    payload: CalculationTaskCreate,
    container: AppContainer = Depends(get_container),
):
    status_code, response = await container.calculation_service.create_task(payload)
    return JSONResponse(status_code=status_code, content=response.model_dump())


@router.get("/tasks/{task_id}", response_model=CalculationTaskResponse)
async def get_calculation_task(
    task_id: str,
    container: AppContainer = Depends(get_container),
):
    response = container.repository.get_calculation_task(task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Calculation task not found")
    return response
