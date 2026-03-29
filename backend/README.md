# Backend MVP

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Environment

1. Copy `backend/.env.example` to `backend/.env`
2. Keep `backend/.env` local only. The repository now ignores it.
3. Set `ANALYSIS_ADAPTER=mock` for local contract testing, or `ANALYSIS_ADAPTER=openai_compatible` for a real model API
4. When using a real model API, fill at least:
   - `ANALYSIS_PROVIDER`
   - `ANALYSIS_REGION`
   - `ANALYSIS_API_BASE_URL`
   - `ANALYSIS_API_KEY`
   - `ANALYSIS_MODEL`
5. When using Brave Search, fill at least:
   - `SEARCH_ADAPTER=brave`
   - `SEARCH_API_KEY`

Example:

```bash
ANALYSIS_ADAPTER=openai_compatible
ANALYSIS_PROVIDER=minimax
ANALYSIS_REGION=cn
ANALYSIS_API_BASE_URL=https://api.minimaxi.com/v1
ANALYSIS_API_KEY=your_api_key
ANALYSIS_MODEL=MiniMax-M2.5
SEARCH_ADAPTER=brave
SEARCH_API_BASE_URL=https://api.search.brave.com/res/v1/web/search
SEARCH_API_KEY=your_brave_key
CHART_ADAPTER=structured
CALCULATION_MCP_ENABLED=true
```

MiniMax notes:

- Official OpenAI-compatible global endpoint: `https://api.minimax.io/v1`
- Official China endpoint used in domestic examples: `https://api.minimaxi.com/v1`
- The backend keeps provider, region, base URL, and model separate so you can switch models or gateways without touching code

Brave Search notes:

- Web search endpoint: `https://api.search.brave.com/res/v1/web/search`
- Auth header: `X-Subscription-Token`
- Search adapter output is mapped into backend `EvidenceItem` records so the frontend contract stays unchanged

Debug console notes:

- Protected debug APIs live under `/api/debug/*`
- Debug credentials come from `DEBUG_USERNAME` and `DEBUG_PASSWORD` in `backend/.env`
- The regular user UI and the debug UI are intentionally split so audit logs are no longer embedded in the main frontend experience

## Current scope

- FastAPI skeleton for the Genius Actuary backend
- Python orchestrator main loop
- Switchable analysis adapter: `mock` or OpenAI-compatible chat completions API
- Switchable search adapter: `mock` or Brave Search API
- Local calculation MCP can evaluate deterministic formulas from AI-planned tasks
- Structured chart MCP can turn completed calculation tasks into frontend-ready chart specs
- Frontend-facing session APIs with stable response contracts
- Cookie-based anonymous client isolation for web sessions
- SQLite-based session persistence

## Clarification contract

- Every clarification question must support custom user input.
- `allow_custom_input` should be treated as a required product invariant, not an optional model preference.
- Preset options are there to speed up answering, but they must never prevent the user from supplying free-form context.
- If a model response or mock payload marks a question as not allowing custom input, backend code should normalize it back to allowed behavior before it reaches the UI.

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
