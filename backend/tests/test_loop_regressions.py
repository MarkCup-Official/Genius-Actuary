import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from app.adapters.search import BraveSearchAdapter
from app.bootstrap import AppServices
from app.domain.models import (
    AnalysisMode,
    AnalysisReport,
    AnalysisSession,
    ClarificationQuestion,
    SearchTask,
)
from app.main import create_app
from app.orchestrator.engine import AnalysisOrchestrator
from app.persistence.memory import InMemorySessionRepository
from app.services.audit import AuditLogService
from app.services.sessions import SessionService
from app.adapters.llm_analysis import OpenAICompatibleAnalysisAdapter


class RepositoryWithAudit(InMemorySessionRepository):
    def __init__(self) -> None:
        super().__init__()
        self._audit_logs = {}

    def save_audit_log(self, entry):
        self._audit_logs[entry.log_id] = entry
        return entry

    def list_audit_logs(self, limit: int = 200):
        return list(self._audit_logs.values())[:limit]

    def get_audit_log(self, log_id: str):
        return self._audit_logs.get(log_id)


class ExplodingAnalysisAdapter:
    def generate_initial_questions(self, session: AnalysisSession) -> list[ClarificationQuestion]:
        return [
            ClarificationQuestion(
                question_text="What matters most?",
                purpose="Collect the key decision driver.",
                options=["Taste", "Price"],
                allow_skip=False,
                priority=1,
            )
        ]

    def plan_next_round(self, session: AnalysisSession):
        raise ValueError("priority parse exploded")

    def build_report(self, session: AnalysisSession) -> AnalysisReport:
        raise AssertionError("build_report should not be called in this test")


class NoopSearchAdapter:
    def run(self, tasks):
        return []


class NoopCalculationAdapter:
    def run(self, tasks):
        return tasks


class NoopChartAdapter:
    def build_preview(self, session):
        return []


def build_services():
    repository = RepositoryWithAudit()
    audit_log_service = AuditLogService(repository)
    session_service = SessionService(repository, audit_log_service)
    orchestrator = AnalysisOrchestrator(
        repository=repository,
        audit_log_service=audit_log_service,
        analysis_adapter=ExplodingAnalysisAdapter(),
        search_adapter=NoopSearchAdapter(),
        calculation_adapter=NoopCalculationAdapter(),
        chart_adapter=NoopChartAdapter(),
    )
    return AppServices(
        session_service=session_service,
        audit_log_service=audit_log_service,
        orchestrator=orchestrator,
    )


class PriorityParsingTests(unittest.TestCase):
    def test_parse_questions_accepts_string_priority_and_boolean_like_values(self):
        adapter = OpenAICompatibleAnalysisAdapter(
            provider="test",
            base_url="http://example.com",
            api_key="test-key",
            model="test-model",
        )

        questions = adapter._parse_questions(
            [
                {
                    "question_text": "What still matters?",
                    "purpose": "Check fallback logic.",
                    "options": ["A", "B"],
                    "allow_skip": "false",
                    "priority": "critical",
                }
            ]
        )

        self.assertEqual(1, len(questions))
        self.assertFalse(questions[0].allow_skip)
        self.assertEqual(1, questions[0].priority)

    def test_generate_initial_questions_retries_when_first_payload_is_invalid(self):
        adapter = OpenAICompatibleAnalysisAdapter(
            provider="test",
            base_url="http://example.com",
            api_key="test-key",
            model="test-model",
            retry_attempts=2,
        )
        session = AnalysisSession(
            owner_client_id="client-1",
            mode=AnalysisMode.SINGLE_DECISION,
            problem_statement="Estimate the budget for a student competition.",
        )

        with patch.object(
            adapter,
            "_request_json",
            side_effect=[
                {"questions": []},
                {
                    "questions": [
                        {
                            "question_text": "What is the target audience size?",
                            "purpose": "Estimate venue and staffing needs.",
                            "options": ["100", "300", "500"],
                            "priority": 1,
                        }
                    ]
                },
            ],
        ) as request_mock:
            questions = adapter.generate_initial_questions(session)

        self.assertEqual(2, request_mock.call_count)
        self.assertEqual(1, len(questions))
        self.assertTrue(
            any(
                event.kind == "llm_retrying_after_invalid_output"
                for event in session.events
            )
        )


class BraveSearchAdapterTests(unittest.TestCase):
    def test_brave_search_adapter_marks_task_failed_after_connect_errors(self):
        adapter = BraveSearchAdapter(
            base_url="https://api.search.brave.com/res/v1/web/search",
            api_key="test-key",
            country="CN",
            search_language="zh-hans",
            ui_language="zh-CN",
            result_count=3,
            extra_snippets=True,
            retry_attempts=2,
        )
        task = SearchTask(
            search_topic="高校场地租赁价格",
            search_goal="获取一线城市高校场地报价",
            search_scope="2024-2025 公开网页",
        )

        with patch(
            "app.adapters.search.httpx.get",
            side_effect=httpx.ConnectError("EOF occurred in violation of protocol"),
        ) as get_mock:
            evidence = adapter.run([task])

        self.assertEqual([], evidence)
        self.assertEqual("failed", task.status)
        self.assertEqual(2, get_mock.call_count)
        self.assertIn("Search failed after 2 attempts", task.notes)


class SessionStepHttpTests(unittest.TestCase):
    def test_step_route_returns_failed_session_instead_of_http_500(self):
        services = build_services()
        app = create_app()

        with patch("app.api.routes.get_app_services", return_value=services):
            client = TestClient(app)
            create_response = client.post(
                "/api/sessions",
                json={
                    "mode": AnalysisMode.MULTI_OPTION.value,
                    "problem_statement": "Should I eat McDonald's tomorrow night?",
                },
            )
            self.assertEqual(200, create_response.status_code)
            session_id = create_response.json()["session_id"]

            session_response = client.get(f"/api/sessions/{session_id}")
            self.assertEqual(200, session_response.status_code)
            question_id = session_response.json()["clarification_questions"][0]["question_id"]

            step_response = client.post(
                f"/api/sessions/{session_id}/step",
                json={
                    "answers": [
                        {
                            "question_id": question_id,
                            "value": "Taste",
                            "source": "frontend",
                        }
                    ]
                },
            )
            self.assertEqual(200, step_response.status_code)
            self.assertEqual("FAILED", step_response.json()["status"])

            saved_session = services.session_service.get_session(session_id)
            self.assertIsNotNone(saved_session)
            self.assertEqual("FAILED", saved_session.status.value)
            self.assertEqual("unexpected_error", saved_session.activity_status)
            self.assertTrue(
                any(
                    event.kind == "orchestrator_unexpected_exception"
                    for event in saved_session.events
                )
            )


if __name__ == "__main__":
    unittest.main()
