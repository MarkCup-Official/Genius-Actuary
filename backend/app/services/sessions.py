from app.domain.models import AnalysisMode, AnalysisSession, SessionEvent, UserAnswer
from app.persistence.memory import InMemorySessionRepository


class SessionService:
    def __init__(self, repository: InMemorySessionRepository) -> None:
        self.repository = repository

    def create_session(
        self,
        mode: AnalysisMode,
        problem_statement: str,
        owner_client_id: str,
    ) -> AnalysisSession:
        session = AnalysisSession(
            owner_client_id=owner_client_id,
            mode=mode,
            problem_statement=problem_statement,
        )
        session.events.append(
            SessionEvent(
                kind="session_created",
                payload={
                    "mode": mode.value,
                    "problem_statement": problem_statement,
                    "owner_client_id": owner_client_id,
                },
            )
        )
        return self.repository.save(session)

    def get_session(self, session_id: str) -> AnalysisSession | None:
        return self.repository.get(session_id)

    def record_answers(self, session_id: str, answers: list[UserAnswer]) -> AnalysisSession | None:
        session = self.repository.get(session_id)
        if session is None:
            return None

        for answer in answers:
            session.answers.append(answer)
            for question in session.clarification_questions:
                if question.question_id == answer.question_id:
                    question.answered = True

        session.events.append(
            SessionEvent(
                kind="answers_recorded",
                payload={"count": len(answers)},
            )
        )
        return self.repository.save(session)
