from __future__ import annotations

import json
from typing import Any

import httpx

from app.domain.models import (
    AnalysisLoopPlan,
    AnalysisMode,
    AnalysisReport,
    AnalysisSession,
    CalculationTask,
    ChartTask,
    ClarificationQuestion,
    MajorConclusionItem,
    SessionEvent,
    SearchTask,
)
from app.prompts import (
    build_clarification_prompts,
    build_planning_prompts,
    build_reporting_prompts,
)


class MockAnalysisAdapter:
    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        base_questions = [
            ClarificationQuestion(
                question_text="What outcome matters most in this decision?",
                purpose="Clarify the primary objective before analysis starts.",
                options=["Save money", "Reduce risk", "Improve long-term return", "Save time"],
                priority=1,
            ),
            ClarificationQuestion(
                question_text="What hard constraints should the analysis respect?",
                purpose="Capture limits such as budget, timing, geography, or compliance requirements.",
                options=["Budget limit", "Time limit", "Low risk tolerance", "Need fast execution"],
                priority=1,
            ),
        ]
        if session.mode == AnalysisMode.MULTI_OPTION:
            base_questions.append(
                ClarificationQuestion(
                    question_text="Which options are you actively comparing?",
                    purpose="Turn the problem into an explicit option set for comparison.",
                    options=[],
                    priority=1,
                )
            )
        return base_questions

    def plan_next_round(
        self,
        session: AnalysisSession,
    ) -> AnalysisLoopPlan:
        conclusions = [
            MajorConclusionItem(
                content=(
                    "The session should compare the user's stated objective, constraints, and public facts "
                    "before a final recommendation is generated."
                ),
                conclusion_type="inference",
                confidence=0.72,
            )
        ]

        unanswered = [question for question in session.clarification_questions if not question.answered]
        if unanswered:
            return AnalysisLoopPlan(
                major_conclusions=conclusions,
                reasoning_focus="Collect the missing user-specific constraints first.",
                stop_reason="Waiting for outstanding clarification answers before planning the next round.",
            )

        if not session.evidence_items:
            return AnalysisLoopPlan(
                search_tasks=[
                    SearchTask(
                        search_topic="External fact check",
                        search_goal="Validate the most decision-relevant public facts, costs, or policy details.",
                        search_scope="Prioritize the latest 12 months and sources directly related to the user's region.",
                        suggested_queries=[
                            session.problem_statement,
                            f"{session.problem_statement} cost",
                            f"{session.problem_statement} policy",
                        ],
                        required_fields=["title", "source", "date", "key facts"],
                        freshness_requirement="high",
                    )
                ],
                major_conclusions=conclusions,
                reasoning_focus="Verify high-impact external facts before finalizing the recommendation.",
                stop_reason="Search MCP should gather evidence for the next analysis round.",
            )

        if not session.calculation_tasks:
            return AnalysisLoopPlan(
                calculation_tasks=[
                    CalculationTask(
                        objective="Compute current evidence-backed readiness score",
                        formula_hint="answer_count * 10 + evidence_count * 15",
                        input_params={
                            "answer_count": len(session.answers),
                            "evidence_count": len(session.evidence_items),
                        },
                        unit="points",
                    )
                ],
                chart_tasks=[
                    ChartTask(
                        objective="Visualize the current readiness score",
                        chart_type="bar",
                        title="Readiness Score Snapshot",
                        preferred_unit="points",
                    )
                ],
                major_conclusions=conclusions,
                reasoning_focus="Quantify the current decision-readiness snapshot before reporting.",
                stop_reason="Calculation MCP and Chart MCP should turn the current context into a numeric summary.",
            )

        if len(session.answers) < 3 and len(session.clarification_questions) < 5:
            return AnalysisLoopPlan(
                clarification_questions=[
                    ClarificationQuestion(
                        question_text="Which trade-off matters more if the ideal outcome is impossible to achieve?",
                        purpose="Clarify fallback priorities so the recommendation can stay useful under uncertainty.",
                        options=["Lower cost", "Lower risk", "Higher upside", "More flexibility"],
                        priority=2,
                    )
                ],
                major_conclusions=conclusions,
                reasoning_focus="Resolve the user's fallback preference before closing the loop.",
                stop_reason="A small follow-up round is needed before the report is stable.",
            )

        return AnalysisLoopPlan(
            major_conclusions=conclusions,
            ready_for_report=True,
            reasoning_focus="The current evidence set is sufficient for a bounded recommendation.",
            stop_reason="No additional clarification or search is required for the MVP report.",
        )

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        assumptions = []
        if not session.answers:
            assumptions.append("The user has not provided a complete constraint set yet.")
        if not session.evidence_items:
            assumptions.append("External evidence is still generated from placeholder search results.")

        recommendations = [
            "Review the calculation outputs alongside the distilled evidence before finalizing a recommendation.",
            "Keep orchestration on the backend and let the frontend render only the server response contract.",
        ]
        return AnalysisReport(
            summary=(
                "The backend session loop is operational: it can clarify the problem, plan tasks, "
                "accumulate conclusions, and return the next action for the frontend."
            ),
            assumptions=assumptions,
            recommendations=recommendations,
            open_questions=[],
            chart_refs=[artifact.chart_id for artifact in session.chart_artifacts],
            markdown=(
                "## Summary\n"
                "The backend orchestration loop can already support clarification, iterative planning, "
                "conclusion distillation, calculation, chart generation, and report generation.\n\n"
                "## Recommendations\n"
                + "\n".join(f"- {item}" for item in recommendations)
            ),
        )


class LLMInvocationError(RuntimeError):
    pass


class OpenAICompatibleAnalysisAdapter(MockAnalysisAdapter):
    def __init__(
        self,
        *,
        provider: str,
        base_url: str,
        api_key: str,
        model: str,
        timeout_seconds: float = 30,
        retry_attempts: int = 3,
    ) -> None:
        self.provider = provider
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = max(1, retry_attempts)

    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        system_prompt, user_prompt = build_clarification_prompts(session)
        payload = self._request_json_with_retry(
            session=session,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            operation="generate clarification questions",
        )
        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            raise LLMInvocationError(
                "Failed to generate clarification questions because the response payload was invalid."
            )

        parsed: list[ClarificationQuestion] = []
        for item in questions[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                ClarificationQuestion(
                    question_text=str(item.get("question_text", "")).strip() or "What should we clarify first?",
                    purpose=str(item.get("purpose", "")).strip() or "Collect the missing decision context.",
                    options=self._string_list(item.get("options")),
                    allow_custom_input=True,
                    allow_skip=self._coerce_bool(item.get("allow_skip", True), default=True),
                    priority=self._coerce_priority(item.get("priority", 1)),
                )
            )

        if not parsed:
            raise LLMInvocationError(
                "Failed to generate clarification questions because none of the returned items could be parsed."
            )

        return parsed

    def plan_next_round(
        self,
        session: AnalysisSession,
    ) -> AnalysisLoopPlan:
        system_prompt, user_prompt = build_planning_prompts(session)
        payload = self._request_json_with_retry(
            session=session,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            operation="plan the next analysis round",
        )

        clarification_questions = self._parse_questions(payload.get("clarification_questions"))
        search_tasks = self._parse_search_tasks(payload.get("search_tasks"))
        calculation_tasks = self._parse_calculation_tasks(payload.get("calculation_tasks"))
        chart_tasks = self._parse_chart_tasks(payload.get("chart_tasks"))
        conclusions = self._parse_conclusions(payload.get("major_conclusions"))
        ready_for_report = self._coerce_bool(payload.get("ready_for_report", False), default=False)
        reasoning_focus = str(payload.get("reasoning_focus", "")).strip()
        stop_reason = str(payload.get("stop_reason", "")).strip()

        if (
            not clarification_questions
            and not search_tasks
            and not calculation_tasks
            and not chart_tasks
            and not conclusions
            and not ready_for_report
        ):
            raise LLMInvocationError(
                "Failed to plan the next analysis round because the response payload was invalid."
            )
        return AnalysisLoopPlan(
            clarification_questions=clarification_questions,
            search_tasks=search_tasks,
            calculation_tasks=calculation_tasks,
            chart_tasks=chart_tasks,
            major_conclusions=conclusions,
            ready_for_report=ready_for_report,
            reasoning_focus=reasoning_focus,
            stop_reason=stop_reason,
        )

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        system_prompt, user_prompt = build_reporting_prompts(session)
        payload = self._request_json_with_retry(
            session=session,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            operation="build the final report",
        )

        summary = str(payload.get("summary", "")).strip()
        if not summary:
            raise LLMInvocationError(
                "Failed to build the final report because the response did not include a summary."
            )

        return AnalysisReport(
            summary=summary,
            assumptions=self._string_list(payload.get("assumptions")),
            recommendations=self._string_list(payload.get("recommendations")),
            open_questions=self._string_list(payload.get("open_questions")),
            chart_refs=[artifact.chart_id for artifact in session.chart_artifacts],
            markdown=str(payload.get("markdown", "")).strip(),
        )

    def _parse_questions(self, value: Any) -> list[ClarificationQuestion]:
        if not isinstance(value, list):
            return []

        parsed: list[ClarificationQuestion] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                ClarificationQuestion(
                    question_text=str(item.get("question_text", "")).strip()
                    or "What else should we clarify before the next round?",
                    purpose=str(item.get("purpose", "")).strip()
                    or "Collect missing information for the next analysis round.",
                    options=self._string_list(item.get("options")),
                    allow_custom_input=True,
                    allow_skip=self._coerce_bool(item.get("allow_skip", True), default=True),
                    priority=self._coerce_priority(item.get("priority", 1)),
                )
            )
        return parsed

    def _parse_search_tasks(self, value: Any) -> list[SearchTask]:
        if not isinstance(value, list):
            return []

        parsed: list[SearchTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                SearchTask(
                    search_topic=str(item.get("search_topic", "")).strip() or "External fact check",
                    search_goal=str(item.get("search_goal", "")).strip()
                    or "Validate the most relevant external facts.",
                    search_scope=str(item.get("search_scope", "")).strip()
                    or "Prioritize recent authoritative sources.",
                    suggested_queries=self._string_list(item.get("suggested_queries")),
                    required_fields=self._string_list(item.get("required_fields")),
                    freshness_requirement=str(item.get("freshness_requirement", "high")).strip() or "high",
                )
            )
        return parsed

    def _parse_conclusions(self, value: Any) -> list[MajorConclusionItem]:
        if not isinstance(value, list):
            return []

        parsed: list[MajorConclusionItem] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            confidence_raw = item.get("confidence", 0.6)
            try:
                confidence = float(confidence_raw)
            except (TypeError, ValueError):
                confidence = 0.6

            parsed.append(
                MajorConclusionItem(
                    content=str(item.get("content", "")).strip()
                    or "Initial inference prepared by the analysis model.",
                    conclusion_type=str(item.get("conclusion_type", "inference")).strip() or "inference",
                    basis_refs=self._string_list(item.get("basis_refs")),
                    confidence=max(0.0, min(1.0, confidence)),
                )
            )
        return parsed

    def _parse_calculation_tasks(self, value: Any) -> list[CalculationTask]:
        if not isinstance(value, list):
            return []

        parsed: list[CalculationTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            input_params = item.get("input_params")
            parsed.append(
                CalculationTask(
                    objective=str(item.get("objective", "")).strip()
                    or "Compute a decision-relevant numeric summary.",
                    formula_hint=str(item.get("formula_hint", "")).strip()
                    or "0",
                    input_params=input_params if isinstance(input_params, dict) else {},
                    unit=str(item.get("unit", "")).strip(),
                )
            )
        return parsed

    def _parse_chart_tasks(self, value: Any) -> list[ChartTask]:
        if not isinstance(value, list):
            return []

        parsed: list[ChartTask] = []
        for item in value[:5]:
            if not isinstance(item, dict):
                continue
            parsed.append(
                ChartTask(
                    objective=str(item.get("objective", "")).strip()
                    or "Visualize the most decision-relevant numeric comparison.",
                    chart_type=self._normalize_chart_type(item.get("chart_type")),
                    title=str(item.get("title", "")).strip() or "Decision chart",
                    preferred_unit=str(item.get("preferred_unit", "")).strip(),
                    source_task_ids=self._string_list(item.get("source_task_ids")),
                    notes=str(item.get("notes", "")).strip(),
                )
            )
        return parsed

    def _request_json_with_retry(
        self,
        *,
        session: AnalysisSession,
        system_prompt: str,
        user_prompt: str,
        operation: str,
    ) -> dict[str, Any]:
        last_error: Exception | None = None

        for attempt in range(1, self.retry_attempts + 1):
            request_payload = self._build_request_payload(system_prompt=system_prompt, user_prompt=user_prompt)
            session.events.append(
                SessionEvent(
                    kind="llm_request_started",
                    payload={
                        "operation": operation,
                        "attempt": attempt,
                        "provider": self.provider,
                        "base_url": self.base_url,
                        "model": self.model,
                        "system_prompt": system_prompt,
                        "user_prompt": user_prompt,
                        "request_json": request_payload,
                    },
                )
            )
            try:
                return self._request_json(
                    session=session,
                    operation=operation,
                    attempt=attempt,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                )
            except Exception as error:
                last_error = error
                session.events.append(
                    SessionEvent(
                        kind="llm_request_failed",
                        payload={
                            "operation": operation,
                            "attempt": attempt,
                            "error_type": type(error).__name__,
                            "error_message": str(error),
                        },
                    )
                )
                if attempt == self.retry_attempts:
                    break

        detail = str(last_error) if last_error else "Unknown LLM invocation error."
        raise LLMInvocationError(
            f"Failed to {operation} after {self.retry_attempts} attempts. Last error: {detail}"
        ) from last_error

    def _request_json(
        self,
        *,
        session: AnalysisSession,
        operation: str,
        attempt: int,
        system_prompt: str,
        user_prompt: str,
    ) -> dict[str, Any]:
        request_payload = self._build_request_payload(system_prompt=system_prompt, user_prompt=user_prompt)
        response = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        session.events.append(
            SessionEvent(
                kind="llm_response_received",
                payload={
                    "operation": operation,
                    "attempt": attempt,
                    "status_code": response.status_code,
                    "response_json": payload,
                },
            )
        )
        content = payload["choices"][0]["message"]["content"]
        if isinstance(content, list):
            content = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict) and isinstance(part.get("text"), str)
            )
        if not isinstance(content, str):
            raise ValueError("Model response content is not a string.")
        parsed = self._loads_json_object(content)
        if not isinstance(parsed, dict):
            raise ValueError("Model response is not a JSON object.")
        session.events.append(
            SessionEvent(
                kind="llm_response_parsed",
                payload={
                    "operation": operation,
                    "attempt": attempt,
                    "parsed_json": parsed,
                },
            )
        )
        return parsed

    def _build_request_payload(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
        }

    @staticmethod
    def _string_list(value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @staticmethod
    def _coerce_bool(value: Any, *, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y", "on"}:
                return True
            if normalized in {"false", "0", "no", "n", "off", ""}:
                return False
        return default

    @staticmethod
    def _coerce_priority(value: Any, *, default: int = 1) -> int:
        if isinstance(value, bool):
            return default

        if isinstance(value, (int, float)):
            return max(1, int(value))

        if isinstance(value, str):
            normalized = value.strip().lower()
            if not normalized:
                return default
            try:
                return max(1, int(float(normalized)))
            except ValueError:
                priority_aliases = {
                    "critical": 1,
                    "highest": 1,
                    "high": 2,
                    "medium": 3,
                    "normal": 3,
                    "moderate": 3,
                    "low": 4,
                    "lowest": 5,
                    "urgent": 1,
                    "important": 2,
                    "一般": 3,
                    "中": 3,
                    "中等": 3,
                    "高": 2,
                    "较高": 2,
                    "低": 4,
                    "较低": 4,
                    "紧急": 1,
                }
                return priority_aliases.get(normalized, default)

        return default

    @staticmethod
    def _normalize_chart_type(value: Any) -> str:
        normalized = str(value or "").strip().lower()
        if normalized in {"bar", "line", "radar", "pie"}:
            return normalized
        return "bar"

    @staticmethod
    def _loads_json_object(content: str) -> dict[str, Any]:
        content = content.strip()
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in model response.")

        parsed = json.loads(content[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("Extracted JSON payload is not an object.")
        return parsed
