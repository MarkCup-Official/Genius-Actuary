# Backend MVP

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Current scope

- FastAPI skeleton for the Genius Actuary backend
- Python orchestrator main loop
- Mock MCP adapters for analysis, search, and chart generation
- Frontend-facing session APIs with stable response contracts
- Cookie-based anonymous client isolation for web sessions
- SQLite-based session persistence

## Storage

- Default database path: `backend/data/genius_actuary.db`
- Current implementation stores the full session as JSON and keeps key columns indexed in SQLite.
- This keeps the orchestrator stable now and leaves room to normalize tables later.

## Key routes

- `GET /health`
- `GET /api/frontend/bootstrap`
- `POST /api/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/sessions/{session_id}/step`
