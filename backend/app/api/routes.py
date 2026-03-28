from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response

from app.bootstrap import get_app_services
from app.domain.schemas import (
    ContinueSessionRequest,
    FrontendBootstrapResponse,
    SessionCreateRequest,
    SessionResponse,
    SessionStepResponse,
)

router = APIRouter()
CLIENT_COOKIE_NAME = "genius_actuary_client_id"


def ensure_client_cookie(request: Request, response: Response) -> str:
    client_id = request.cookies.get(CLIENT_COOKIE_NAME)
    if client_id:
        return client_id

    client_id = str(uuid4())
    response.set_cookie(
        key=CLIENT_COOKIE_NAME,
        value=client_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 30,
    )
    return client_id


def assert_session_owner(session: SessionResponse, client_id: str) -> None:
    if session.owner_client_id != client_id:
        raise HTTPException(status_code=404, detail="Session not found.")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/api/frontend/bootstrap", response_model=FrontendBootstrapResponse)
def frontend_bootstrap(request: Request, response: Response) -> FrontendBootstrapResponse:
    ensure_client_cookie(request, response)
    services = get_app_services()
    return FrontendBootstrapResponse(
        app_name="Genius Actuary",
        supported_modes=services.orchestrator.supported_modes(),
        session_statuses=services.orchestrator.supported_statuses(),
        next_actions=services.orchestrator.supported_actions(),
        notes=[
            "Current MCP adapters are mock implementations with stable contracts.",
            "Frontend should only call backend APIs and should not orchestrate MCP logic directly.",
        ],
    )


@router.post("/api/sessions", response_model=SessionStepResponse)
def create_session(
    payload: SessionCreateRequest,
    request: Request,
    response: Response,
) -> SessionStepResponse:
    services = get_app_services()
    client_id = ensure_client_cookie(request, response)
    session = services.session_service.create_session(
        mode=payload.mode,
        problem_statement=payload.problem_statement,
        owner_client_id=client_id,
    )
    return services.orchestrator.advance_session(session.session_id)


@router.get("/api/sessions/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    request: Request,
    response: Response,
) -> SessionResponse:
    services = get_app_services()
    client_id = ensure_client_cookie(request, response)
    session = services.session_service.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    session_response = SessionResponse.model_validate(session)
    assert_session_owner(session_response, client_id)
    return session_response


@router.post("/api/sessions/{session_id}/step", response_model=SessionStepResponse)
def continue_session(
    session_id: str,
    payload: ContinueSessionRequest,
    request: Request,
    response: Response,
) -> SessionStepResponse:
    services = get_app_services()
    client_id = ensure_client_cookie(request, response)
    session = services.session_service.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    assert_session_owner(SessionResponse.model_validate(session), client_id)

    if payload.answers:
        services.session_service.record_answers(session_id, payload.answers)

    return services.orchestrator.advance_session(session_id)
