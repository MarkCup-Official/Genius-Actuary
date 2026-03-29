from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.search import SearchTaskCreate, SearchTaskResponse

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.post("/tasks", response_model=SearchTaskResponse)
async def create_search_task(
    payload: SearchTaskCreate,
    container: AppContainer = Depends(get_container),
):
    status_code, response = await container.search_service.create_task(payload)
    return JSONResponse(status_code=status_code, content=response.model_dump())


@router.get("/tasks/{task_id}", response_model=SearchTaskResponse)
async def get_search_task(
    task_id: str,
    container: AppContainer = Depends(get_container),
):
    response = container.repository.get_search_task(task_id)
    if response is None:
        raise HTTPException(status_code=404, detail="Search task not found")
    return response
