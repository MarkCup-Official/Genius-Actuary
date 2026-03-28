from app.domain.models import EvidenceItem, SearchTask


class MockSearchAdapter:
    def run(self, tasks: list[SearchTask]) -> list[EvidenceItem]:
        evidence: list[EvidenceItem] = []
        for task in tasks:
            evidence.append(
                EvidenceItem(
                    title=f"Mock result for {task.search_topic}",
                    source_url="https://example.com/mock-search",
                    source_name="MockSearch",
                    summary=f"Placeholder evidence generated for query planning: {task.search_goal}",
                    extracted_facts=[
                        "This is a mock evidence item.",
                        "Replace this adapter with a real MCP or external API integration.",
                    ],
                    confidence=0.35,
                )
            )
            task.status = "completed"
        return evidence
