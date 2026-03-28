import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.bootstrap import AppServices
from app.domain.models import AnalysisMode, AnalysisReport, AnalysisSession, ClarificationQuestion
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
