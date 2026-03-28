from app.domain.models import AnalysisSession, ChartArtifact


class MockChartAdapter:
    def build_preview(self, session: AnalysisSession) -> list[ChartArtifact]:
        if session.chart_artifacts:
            return session.chart_artifacts

        chart = ChartArtifact(
            chart_type="bar",
            title="MVP Integration Progress",
            spec={
                "labels": ["Backend Loop", "MCP Adapters", "Frontend Contract"],
                "values": [80, 40, 55],
                "unit": "percent",
            },
            notes="Mock chart artifact for frontend integration.",
        )
        return [chart]
