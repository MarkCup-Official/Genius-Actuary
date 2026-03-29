from __future__ import annotations


def test_chart_both_mode_returns_spec_and_image(client):
    payload = {
        "session_id": "session-1",
        "chart_type": "bar",
        "title": "Cost Comparison",
        "subtitle": "MVP test",
        "dataset": {
            "labels": ["6m", "12m"],
            "values": {
                "exchange": [10, 15],
                "no_exchange": [8, 9],
            },
        },
        "series": [
            {"key": "exchange", "label": "Exchange", "observed": False},
            {"key": "no_exchange", "label": "No Exchange", "observed": True},
        ],
        "axes": {"x": "Time", "y": "Cost"},
        "units": {"y": "k USD"},
        "source_refs": ["search-task-1"],
        "render_mode": "both",
    }
    response = client.post("/api/v1/charts/tasks", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["result"]["image_available"] is True
    assert body["result"]["chart_spec"]["estimated_vs_observed"]["exchange"] is True

    image = client.get(f"/api/v1/charts/tasks/{body['task_id']}/image")
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/png"


def test_chart_rejects_insufficient_data_and_persists(client):
    payload = {
        "session_id": "session-1",
        "chart_type": "line",
        "title": "Invalid",
        "dataset": {
            "labels": ["6m", "12m"],
            "values": {
                "exchange": [10],
            },
        },
        "series": [
            {"key": "exchange", "label": "Exchange"},
        ],
        "render_mode": "spec",
    }
    response = client.post("/api/v1/charts/tasks", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error_code"] == "insufficient_chart_data"

    follow_up = client.get(f"/api/v1/charts/tasks/{body['task_id']}")
    assert follow_up.status_code == 200
    assert follow_up.json()["status"] == "failed"
