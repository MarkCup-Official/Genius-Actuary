from __future__ import annotations


def test_search_calculation_chart_smoke_chain(client):
    session_id = "session-shared"

    search = client.post(
        "/api/v1/search/tasks",
        json={
            "session_id": session_id,
            "search_topic": "Singapore exchange",
            "search_goal": "Find public facts",
            "search_scope": {"country": "SG"},
            "suggested_queries": ["Singapore exchange cost 2026"],
            "required_fields": ["cost"],
            "max_results": 3,
        },
    )
    assert search.status_code == 200
    search_body = search.json()

    calculation = client.post(
        "/api/v1/calculations/tasks",
        json={
            "session_id": session_id,
            "task_type": "formula_eval",
            "expression": "a+b",
            "variables": {"a": 1, "b": 2},
            "expected_outputs": ["sum"],
        },
    )
    assert calculation.status_code == 200
    calc_body = calculation.json()

    chart = client.post(
        "/api/v1/charts/tasks",
        json={
            "session_id": session_id,
            "chart_type": "radar",
            "title": "Decision Dimensions",
            "dataset": {
                "labels": ["cost", "risk", "growth"],
                "values": {
                    "option_a": [4, 6, 8],
                    "option_b": [6, 4, 7],
                },
            },
            "series": [
                {"key": "option_a", "label": "Option A", "observed": False},
                {"key": "option_b", "label": "Option B", "observed": True},
            ],
            "source_refs": [search_body["task_id"], calc_body["task_id"]],
            "render_mode": "both",
        },
    )
    assert chart.status_code == 200
    chart_body = chart.json()

    assert search_body["result"]["request"]["session_id"] == session_id
    assert calc_body["result"]["request"]["session_id"] == session_id
    assert chart_body["result"]["request"]["session_id"] == session_id
