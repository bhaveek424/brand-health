# AI GTM Copilot - Backend

Python FastAPI backend for the AI GTM Copilot workbench.

## Local Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Environment Variables

Create `.env` in the `backend/` directory (do not commit it):

```bash
FRONTEND_URL=http://localhost:3000
```

- `FRONTEND_URL` - CORS origin for the Next.js frontend.

## Endpoints

- `GET /health` - Service status and version.
