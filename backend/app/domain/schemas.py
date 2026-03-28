from pydantic import BaseModel, Field

from app.domain.models import (
    AnalysisMode,
    AnalysisReport,
    AnalysisSession,
    ClarificationQuestion,
    EvidenceItem,
    MajorConclusionItem,
    NextAction,
    SearchTask,
    SessionStatus,
    UserAnswer,
)


class SessionCreateRequest(BaseModel):
    mode: AnalysisMode
    problem_statement: str = Field(min_length=5)


class ContinueSessionRequest(BaseModel):
    answers: list[UserAnswer] = Field(default_factory=list)


class SessionResponse(AnalysisSession):
    pass


class SessionStepResponse(BaseModel):
    session_id: str
    status: SessionStatus
    next_action: NextAction
    prompt_to_user: str
    pending_questions: list[ClarificationQuestion] = Field(default_factory=list)
    pending_search_tasks: list[SearchTask] = Field(default_factory=list)
    evidence_items: list[EvidenceItem] = Field(default_factory=list)
    major_conclusions: list[MajorConclusionItem] = Field(default_factory=list)
    report_preview: AnalysisReport | None = None


class FrontendBootstrapResponse(BaseModel):
    app_name: str
    supported_modes: list[str]
    session_statuses: list[str]
    next_actions: list[str]
    notes: list[str]
