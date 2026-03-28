from app.adapters.chart import MockChartAdapter
from app.adapters.llm_analysis import MockAnalysisAdapter
from app.adapters.search import MockSearchAdapter
from app.domain.models import (
    NextAction,
    SessionEvent,
    SessionStatus,
)
from app.domain.schemas import SessionStepResponse
from app.persistence.base import SessionRepository


class AnalysisOrchestrator:
    def __init__(
        self,
        repository: SessionRepository,
        analysis_adapter: MockAnalysisAdapter,
        search_adapter: MockSearchAdapter,
        chart_adapter: MockChartAdapter,
    ) -> None:
        self.repository = repository
        self.analysis_adapter = analysis_adapter
        self.search_adapter = search_adapter
        self.chart_adapter = chart_adapter

    def supported_modes(self) -> list[str]:
        return ["single_decision", "multi_option"]

    def supported_statuses(self) -> list[str]:
        return [status.value for status in SessionStatus]

    def supported_actions(self) -> list[str]:
        return [action.value for action in NextAction]

    def advance_session(self, session_id: str) -> SessionStepResponse:
        session = self.repository.get(session_id)
        if session is None:
            raise ValueError(f"Session {session_id} not found.")

        if session.status == SessionStatus.INIT:
            session.status = SessionStatus.CLARIFYING
            session.clarification_questions = self.analysis_adapter.generate_initial_questions(session)
            session.events.append(SessionEvent(kind="questions_generated"))
            self.repository.save(session)
            return self._build_response(
                session_id,
                NextAction.ASK_USER,
                "请先补充高价值信息，主循环会在拿到答案后继续推进。",
            )

        if session.status == SessionStatus.CLARIFYING:
            unanswered = [question for question in session.clarification_questions if not question.answered]
            if unanswered:
                self.repository.save(session)
                return self._build_response(
                    session_id,
                    NextAction.ASK_USER,
                    "还有待补充的问题，前端可继续渲染追问表单。",
                )

            session.status = SessionStatus.ANALYZING
            search_tasks, conclusions = self.analysis_adapter.plan_next_round(session)
            session.search_tasks.extend(search_tasks)
            session.major_conclusions.extend(conclusions)
            session.events.append(
                SessionEvent(
                    kind="analysis_planned",
                    payload={"search_task_count": len(search_tasks)},
                )
            )
            self.repository.save(session)
            return self._build_response(
                session_id,
                NextAction.RUN_MCP,
                "主循环已进入分析阶段，当前会先执行 MCP 计划。",
            )

        if session.status == SessionStatus.ANALYZING:
            pending_tasks = [task for task in session.search_tasks if task.status != "completed"]
            if pending_tasks:
                session.evidence_items.extend(self.search_adapter.run(pending_tasks))
                session.chart_artifacts = self.chart_adapter.build_preview(session)
                session.status = SessionStatus.READY_FOR_REPORT
                session.events.append(SessionEvent(kind="mcp_round_completed"))
                self.repository.save(session)
                return self._build_response(
                    session_id,
                    NextAction.PREVIEW_REPORT,
                    "MCP 占位执行完成，已可以预览报告结构。",
                )

            session.status = SessionStatus.READY_FOR_REPORT
            self.repository.save(session)

        if session.status == SessionStatus.READY_FOR_REPORT:
            session.status = SessionStatus.REPORTING
            session.report = self.analysis_adapter.build_report(session)
            session.events.append(SessionEvent(kind="report_built"))
            self.repository.save(session)

        if session.status == SessionStatus.REPORTING:
            session.status = SessionStatus.COMPLETED
            session.events.append(SessionEvent(kind="session_completed"))
            self.repository.save(session)
            return self._build_response(
                session_id,
                NextAction.COMPLETE,
                "报告预览已生成，当前会话主循环已完成一轮闭环。",
            )

        if session.status == SessionStatus.COMPLETED:
            return self._build_response(
                session_id,
                NextAction.COMPLETE,
                "当前会话已完成，可继续扩展为多轮分析或真实 MCP 执行。",
            )

        session.status = SessionStatus.FAILED
        self.repository.save(session)
        return self._build_response(
            session_id,
            NextAction.COMPLETE,
            "会话进入失败状态，请检查 orchestrator 分支。",
        )

    def _build_response(
        self,
        session_id: str,
        next_action: NextAction,
        prompt_to_user: str,
    ) -> SessionStepResponse:
        session = self.repository.get(session_id)
        if session is None:
            raise ValueError(f"Session {session_id} not found.")

        return SessionStepResponse(
            session_id=session.session_id,
            status=session.status,
            next_action=next_action,
            prompt_to_user=prompt_to_user,
            pending_questions=[
                question for question in session.clarification_questions if not question.answered
            ],
            pending_search_tasks=[
                task for task in session.search_tasks if task.status != "completed"
            ],
            evidence_items=session.evidence_items,
            major_conclusions=session.major_conclusions,
            report_preview=session.report,
        )
