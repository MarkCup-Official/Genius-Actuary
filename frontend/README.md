# Frontend Integration Draft

The frontend should treat the backend as the single orchestration source.

## Expected flow

1. Call `GET /api/frontend/bootstrap` first so the backend can issue an anonymous session-isolation cookie.
2. Start a session through `POST /api/sessions`.
3. Render `pending_questions` when `next_action` is `ask_user`.
4. Submit structured answers to `POST /api/sessions/{session_id}/step`.
5. Show progress when `next_action` is `run_mcp`.
6. Render `report_preview`, `evidence_items`, and charts when available.

## Session isolation

- The backend sets an `HttpOnly` cookie named `genius_actuary_client_id`.
- Each analysis session is bound to that cookie value on creation.
- Reads and writes to `/api/sessions/{session_id}` are rejected when the cookie does not match the owner.
- Frontend requests should include credentials so the browser sends the cookie automatically.

## Suggested pages

- Mode selection
- Problem input
- Clarification form
- Analysis progress
- Report preview
