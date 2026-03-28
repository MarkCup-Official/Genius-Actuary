# Genius Actuary

Genius Actuary is an AI decision analysis workspace. This repository now contains the FastAPI backend skeleton, the complete React + TypeScript front-end under `frontend/`, and the earlier static demo retained for reference.

## Repository layout

- `Agent/`: product proposal and task breakdown documents already tracked in the repository
- `backend/`: FastAPI backend with orchestrator loop and mock MCP adapters
- `frontend/`: complete production-oriented web frontend built with React + TypeScript + Vite
- `frontend-demo/`: legacy static prototype kept for reference
- `.github/workflows/ci.yml`: frontend lint, test, and build pipeline

## Frontend highlights

- React + TypeScript + Vite + Tailwind CSS v4
- TanStack Query, React Router, react-i18next, Formik + Yup, Apache ECharts
- Dashboard, analysis flow, report view, settings, profile, notifications, logs, files, data viz, admin roles
- Dark/light/system themes with shared black-gold design tokens
- CSV / PDF export, Dockerfile, and CI

## Frontend quick start

```powershell
cd backend
py -3.13 -m venv .venv313
.\.venv313\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.\.venv313\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Notes

- The frontend currently connects to the backend through the live FastAPI session routes.
- Backend API secrets should live in `backend/.env`, which is now ignored by git.
- The analysis adapter can now run in `mock` mode or through an OpenAI-compatible API, but search/chart adapters are still mock implementations.
- Backend audit logs and session debug views now live behind a separate protected debug web route at `/debug/login`.
- Product rule: every clarification question must support custom user input. Preset options are only shortcuts and must never block free-form answers in the frontend, adapter mappings, mock data, or backend contracts.
- See [`frontend/README.md`](frontend/README.md) for the full frontend architecture and environment setup.
