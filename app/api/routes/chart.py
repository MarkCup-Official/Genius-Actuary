from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, Response

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.chart import ChartTaskCreate, ChartTaskResponse

router = APIRouter(prefix="/api/v1/charts", tags=["charts"])


@router.post("/tasks", response_model=ChartTaskResponse)
async def create_chart_task(
    payload: ChartTaskCreate,
    container: AppContainer = Depends(get_container),
):
    status_code, response = await container.chart_service.create_task(payload)
    return JSONResponse(status_code=status_code, content=response.model_dump())


@router.get("/tasks/{task_id}", response_model=ChartTaskResponse)
async def get_chart_task(
    task_id: str,
    container: AppContainer = Depends(get_container),
):
    response = container.repository.get_chart_task(task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Chart task not found")
    return response


@router.get("/tasks/{task_id}/image")
async def get_chart_task_image(
    task_id: str,
    container: AppContainer = Depends(get_container),
):
    artifact = container.repository.get_chart_artifact(task_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Chart image not found")
    return Response(content=artifact["content"], media_type=artifact["mime_type"])
