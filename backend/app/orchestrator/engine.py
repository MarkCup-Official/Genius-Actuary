from typing import Protocol

from app.adapters.chart import DisabledChartAdapter, MockChartAdapter
from app.adapters.llm_analysis import LLMInvocationError
from app.adapters.search import BraveSearchAdapter, MockSearchAdapter
from app.domain.models import (
    AnalysisLoopPlan,
    AnalysisReport,
    AnalysisSession,
    ClarificationQuestion,
    MajorConclusionItem,
    NextAction,
    SearchTask,
    SessionEvent,
    SessionStatus,
)
from app.domain.schemas import SessionStepResponse
from app.persistence.base import SessionRepository
from app.services.audit import AuditLogService


class AnalysisAdapter(Protocol):
    def generate_initial_questions(
        self, session: AnalysisSession
    ) -> list[ClarificationQuestion]: ...

    def plan_next_round(self, session: AnalysisSession) -> AnalysisLoopPlan: ...

    def build_report(self, session: AnalysisSession) -> AnalysisReport: ...


class SearchAdapter(Protocol):
    def run(self, tasks: list[SearchTask]): ...


class ChartAdapter(Protocol):
    def build_preview(self, session: AnalysisSession): ...


class AnalysisOrchestrator:
    def __init__(
        self,
        repository: SessionRepository,
        audit_log_service: AuditLogService,
        analysis_adapter: AnalysisAdapter,
        search_adapter: SearchAdapter,
        chart_adapter: ChartAdapter,
    ) -> None:
        self.repository = repository
        self.audit_log_service = audit_log_service
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

        session.events.append(
            SessionEvent(
                kind="orchestrator_advance_started",
                payload={
                    "status_before": session.status.value,
                    "activity_status_before": session.activity_status,
                    "answers_count": len(session.answers),
                    "question_count": len(session.clarification_questions),
                    "search_task_count": len(session.search_tasks),
                    "evidence_count": len(session.evidence_items),
                    "analysis_rounds_completed": session.analysis_rounds_completed,
                },
            )
        )

        try:
            if session.status == SessionStatus.INIT:
                session.status = SessionStatus.CLARIFYING
                session.error_message = None
                session.activity_status = "waiting_for_llm_clarification_questions"
                self.repository.save(session)

                session.clarification_questions = self.analysis_adapter.generate_initial_questions(session)
                session.activity_status = "waiting_for_user_clarification_answers"
                session.current_focus = "Collect the first round of high-value user constraints."
                session.last_stop_reason = "Waiting for initial clarification answers."
                session.events.append(
                    SessionEvent(
                        kind="questions_generated",
                        payload={
                            "question_count": len(session.clarification_questions),
                            "question_ids": [
                                question.question_id for question in session.clarification_questions
                            ],
                        },
                    )
                )
                self.repository.save(session)
                self._write_log(
                    session,
                    action="QUESTIONS_GENERATED",
                    summary="Generated the initial clarification round for the session.",
                    metadata={"question_count": str(len(session.clarification_questions))},
                )
                return self._build_response(
                    session_id,
                    NextAction.ASK_USER,
                    "请先补充第一轮关键信息，系统会基于答案继续进入循环分析。",
                )

            if session.status == SessionStatus.CLARIFYING:
                unanswered = [question for question in session.clarification_questions if not question.answered]
                if unanswered:
                    session.activity_status = "waiting_for_user_clarification_answers"
                    session.current_focus = "Still waiting for unresolved clarification answers."
                    session.last_stop_reason = "The current round cannot proceed until pending questions are answered."
                    session.events.append(
                        SessionEvent(
                            kind="clarification_waiting_for_answers",
                            payload={
                                "unanswered_count": len(unanswered),
                                "unanswered_question_ids": [
                                    question.question_id for question in unanswered
                                ],
                            },
                        )
                    )
                    self.repository.save(session)
                    return self._build_response(
                        session_id,
                        NextAction.ASK_USER,
                        "还有待补充的问题，前端可以继续渲染追问表单。",
                    )

                return self._apply_loop_plan(session)

            if session.status == SessionStatus.ANALYZING:
                pending_tasks = [task for task in session.search_tasks if task.status != "completed"]
                if pending_tasks:
                    session.activity_status = "running_search_and_chart_pipeline"
                    session.events.append(
                        SessionEvent(
                            kind="search_execution_started",
                            payload={
                                "pending_task_count": len(pending_tasks),
                                "task_ids": [task.task_id for task in pending_tasks],
                            },
                        )
                    )
                    self.repository.save(session)

                    session.evidence_items.extend(self.search_adapter.run(pending_tasks))
                    session.chart_artifacts = self.chart_adapter.build_preview(session)
                    session.events.append(
                        SessionEvent(
                            kind="mcp_round_completed",
                            payload={
                                "evidence_count": len(session.evidence_items),
                                "chart_count": len(session.chart_artifacts),
                            },
                        )
                    )
                    return self._apply_loop_plan(session, action="EVIDENCE_GATHERED")

                return self._apply_loop_plan(session)

            if session.status == SessionStatus.READY_FOR_REPORT:
                session.status = SessionStatus.REPORTING
                session.error_message = None
                session.activity_status = "waiting_for_llm_report_generation"
                self.repository.save(session)

                session.report = self.analysis_adapter.build_report(session)
                session.activity_status = "report_generated_waiting_for_delivery"
                session.last_stop_reason = (
                    session.last_stop_reason or "The structured loop concluded and moved into report writing."
                )
                session.events.append(
                    SessionEvent(
                        kind="report_built",
                        payload={
                            "has_report": session.report is not None,
                            "recommendation_count": len(session.report.recommendations) if session.report else 0,
                            "assumption_count": len(session.report.assumptions) if session.report else 0,
                        },
                    )
                )
                self.repository.save(session)
                self._write_log(
                    session,
                    action="REPORT_BUILT",
                    summary="Built the distilled final report payload from the loop conclusions.",
                    metadata={"has_report": str(session.report is not None).lower()},
                )

            if session.status == SessionStatus.REPORTING:
                session.status = SessionStatus.COMPLETED
                session.activity_status = "completed"
                session.events.append(
                    SessionEvent(
                        kind="session_completed",
                        payload={
                            "status_after": session.status.value,
                            "analysis_rounds_completed": session.analysis_rounds_completed,
                        },
                    )
                )
                self.repository.save(session)
                self._write_log(
                    session,
                    action="SESSION_COMPLETED",
                    summary="Marked the analysis session as completed.",
                )
                return self._build_response(
                    session_id,
                    NextAction.COMPLETE,
                    "最终报告已生成，本轮循环分析完成。",
                )

            if session.status == SessionStatus.COMPLETED:
                return self._build_response(
                    session_id,
                    NextAction.COMPLETE,
                    "当前会话已完成，如需补充新条件可以在后续扩展为新一轮分析。",
                )
        except LLMInvocationError as error:
            session.status = SessionStatus.FAILED
            session.activity_status = "llm_call_failed"
            session.error_message = str(error)
            session.events.append(
                SessionEvent(
                    kind="llm_invocation_failed",
                    payload={"message": session.error_message},
                )
            )
            self.repository.save(session)
            self._write_log(
                session,
                action="LLM_INVOCATION_FAILED",
                summary="LLM invocation failed after retries.",
                status="error",
                metadata={"message": session.error_message or "unknown"},
            )
            return self._build_response(
                session_id,
                NextAction.COMPLETE,
                "LLM 调用重试后仍然失败，请检查模型配置或稍后重试。",
            )

        session.status = SessionStatus.FAILED
        session.activity_status = "failed"
        session.error_message = session.error_message or "The orchestrator reached an unexpected branch."
        session.events.append(
            SessionEvent(
                kind="session_failed",
                payload={
                    "message": session.error_message,
                },
            )
        )
        self.repository.save(session)
        self._write_log(
            session,
            action="SESSION_FAILED",
            summary="Session entered failed state in the orchestrator.",
            status="error",
        )
        return self._build_response(
            session_id,
            NextAction.COMPLETE,
            "会话进入失败状态，请检查 orchestrator 分支。",
        )

    def _apply_loop_plan(
        self,
        session: AnalysisSession,
        *,
        action: str = "ANALYSIS_PLANNED",
    ) -> SessionStepResponse:
        session.error_message = None
        session.activity_status = "waiting_for_llm_round_planning"
        self.repository.save(session)

        plan = self.analysis_adapter.plan_next_round(session)
        session.analysis_rounds_completed += 1
        session.activity_status = "llm_round_plan_ready"
        session.current_focus = plan.reasoning_focus
        session.last_stop_reason = plan.stop_reason

        candidate_questions = self._collect_new_questions(session, plan.clarification_questions)
        follow_up_budget_exhausted = (
            bool(candidate_questions)
            and session.follow_up_rounds_used >= session.follow_up_round_limit
        )

        if follow_up_budget_exhausted:
            session.follow_up_budget_exhausted = True
            session.deferred_follow_up_question_count = len(candidate_questions)
            new_questions: list[ClarificationQuestion] = []
            new_search_tasks: list[SearchTask] = []
            new_conclusions = self._merge_conclusions(session, plan.major_conclusions)
            plan.ready_for_report = True
            session.last_stop_reason = (
                "The follow-up question budget was exhausted, so the current report snapshot is being produced."
            )
        else:
            new_questions = self._append_questions(session, candidate_questions)
            if new_questions:
                session.follow_up_rounds_used += 1
            session.follow_up_budget_exhausted = False
            session.deferred_follow_up_question_count = 0
            new_search_tasks = self._merge_search_tasks(session, plan.search_tasks)
            new_conclusions = self._merge_conclusions(session, plan.major_conclusions)

        session.events.append(
            SessionEvent(
                kind="analysis_planned",
                payload={
                    "analysis_round": session.analysis_rounds_completed,
                    "new_question_count": len(new_questions),
                    "deferred_question_count": session.deferred_follow_up_question_count,
                    "new_search_task_count": len(new_search_tasks),
                    "new_conclusion_count": len(new_conclusions),
                    "ready_for_report": plan.ready_for_report,
                    "follow_up_budget_exhausted": session.follow_up_budget_exhausted,
                    "follow_up_rounds_used": session.follow_up_rounds_used,
                    "follow_up_round_limit": session.follow_up_round_limit,
                    "reasoning_focus": plan.reasoning_focus,
                    "stop_reason": session.last_stop_reason,
                },
            )
        )

        next_action = NextAction.PREVIEW_REPORT
        prompt_to_user = "当前信息已经足够，系统可以进入最终报告阶段。"

        if new_questions:
            session.status = SessionStatus.CLARIFYING
            session.activity_status = "waiting_for_user_clarification_answers"
            next_action = NextAction.ASK_USER
            prompt_to_user = "系统识别到仍有高价值缺口，请继续回答新一轮追问。"
        elif new_search_tasks:
            session.status = SessionStatus.ANALYZING
            session.activity_status = "waiting_for_search_execution"
            next_action = NextAction.RUN_MCP
            prompt_to_user = "系统已规划新的联网查证任务，先执行 MCP 再继续下一轮分析。"
        else:
            session.status = SessionStatus.READY_FOR_REPORT
            session.activity_status = "ready_for_report_generation"
            if not session.last_stop_reason:
                session.last_stop_reason = (
                    "No additional clarification or external search tasks were generated."
                )

        self.repository.save(session)
        self._write_log(
            session,
            action=action,
            summary="Planned a structured LLM analysis round.",
            metadata={
                "analysis_round": str(session.analysis_rounds_completed),
                "new_question_count": str(len(new_questions)),
                "deferred_question_count": str(session.deferred_follow_up_question_count),
                "new_search_task_count": str(len(new_search_tasks)),
                "new_conclusion_count": str(len(new_conclusions)),
                "ready_for_report": str(plan.ready_for_report).lower(),
                "follow_up_budget_exhausted": str(session.follow_up_budget_exhausted).lower(),
                "follow_up_rounds_used": str(session.follow_up_rounds_used),
                "follow_up_round_limit": str(session.follow_up_round_limit),
                "activity_status": session.activity_status,
            },
        )
        return self._build_response(
            session.session_id,
            next_action,
            prompt_to_user,
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
            analysis_rounds_completed=session.analysis_rounds_completed,
            activity_status=session.activity_status,
            current_focus=session.current_focus,
            last_stop_reason=session.last_stop_reason,
            error_message=session.error_message,
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

    def _write_log(
        self,
        session: AnalysisSession,
        *,
        action: str,
        summary: str,
        status: str = "success",
        metadata: dict[str, str] | None = None,
    ) -> None:
        self.audit_log_service.write(
            action=action,
            actor=session.owner_client_id,
            target=session.session_id,
            ip_address="cookie-session",
            summary=summary,
            status=status,
            metadata=metadata,
        )

    @staticmethod
    def _collect_new_questions(
        session: AnalysisSession,
        questions: list[ClarificationQuestion],
    ) -> list[ClarificationQuestion]:
        existing = {
            AnalysisOrchestrator._normalize_text(question.question_text)
            for question in session.clarification_questions
        }
        added: list[ClarificationQuestion] = []
        for question in questions:
            normalized = AnalysisOrchestrator._normalize_text(question.question_text)
            if not normalized or normalized in existing:
                continue
            added.append(question)
            existing.add(normalized)
        return added

    @staticmethod
    def _append_questions(
        session: AnalysisSession,
        questions: list[ClarificationQuestion],
    ) -> list[ClarificationQuestion]:
        session.clarification_questions.extend(questions)
        return questions

    @staticmethod
    def _merge_search_tasks(
        session: AnalysisSession,
        tasks: list[SearchTask],
    ) -> list[SearchTask]:
        existing = {
            (
                AnalysisOrchestrator._normalize_text(task.search_topic),
                AnalysisOrchestrator._normalize_text(task.search_goal),
            )
            for task in session.search_tasks
        }
        added: list[SearchTask] = []
        for task in tasks:
            key = (
                AnalysisOrchestrator._normalize_text(task.search_topic),
                AnalysisOrchestrator._normalize_text(task.search_goal),
            )
            if key in existing:
                continue
            session.search_tasks.append(task)
            added.append(task)
            existing.add(key)
        return added

    @staticmethod
    def _merge_conclusions(
        session: AnalysisSession,
        conclusions: list[MajorConclusionItem],
    ) -> list[MajorConclusionItem]:
        existing = {
            AnalysisOrchestrator._normalize_text(conclusion.content)
            for conclusion in session.major_conclusions
        }
        added: list[MajorConclusionItem] = []
        for conclusion in conclusions:
            normalized = AnalysisOrchestrator._normalize_text(conclusion.content)
            if not normalized or normalized in existing:
                continue
            session.major_conclusions.append(conclusion)
            added.append(conclusion)
            existing.add(normalized)
        return added

    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.lower().split())
