# Genius Actuary MVP Backend

FastAPI backend for the Genius Actuary MVP modules:

- Brave-powered search tasks
- MCP-backed calculation tasks
- chart specification and image generation

## Setup

```powershell
python -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run

```powershell
$env:BRAVE_API_KEY="your-key"
$env:CALCULATION_MCP_ENDPOINT="http://localhost:8001/mcp"
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Optional environment variables:

- `APP_DB_PATH`: SQLite path. Default: `data/genius_actuary.db`
- `BRAVE_BASE_URL`: Default: `https://api.search.brave.com/res/v1/web/search`
- `BRAVE_TIMEOUT_SECONDS`: Default: `15`
- `CALCULATION_MCP_TIMEOUT_SECONDS`: Default: `20`
- `CHART_IMAGE_FORMAT`: Default: `png`

## API

- `POST /api/v1/search/tasks`
- `GET /api/v1/search/tasks/{task_id}`
- `POST /api/v1/calculations/tasks`
- `GET /api/v1/calculations/tasks/{task_id}`
- `POST /api/v1/charts/tasks`
- `GET /api/v1/charts/tasks/{task_id}`
- `GET /api/v1/charts/tasks/{task_id}/image`

## Calculation MCP Contract

This backend calls the configured MCP endpoint with JSON-RPC:

```json
{
  "jsonrpc": "2.0",
  "id": "<task-id>",
  "method": "tools/call",
  "params": {
    "name": "calculate",
    "arguments": {
      "task_type": "formula_eval",
      "expression": "a+b",
      "variables": {"a": 1, "b": 2},
      "constraints": {},
      "units": {},
      "expected_outputs": []
    }
  }
}
```

The implementation accepts either:

- `result.structuredContent`
- `result.content[0].text` containing JSON
- a plain JSON body with `result`

## Notes

- Search and charting work out of the box once the required environment variables are present.
- Calculation requests require a reachable MCP endpoint, or they fail with `502 provider_unavailable`.
