from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="AI GTM Copilot API",
    description="Backend for the AI GTM Copilot workbench.",
    version="0.1.0",
)

# Allow CORS from the Next.js frontend (local dev + deployed preview)
origins = []
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "ai-gtm-copilot",
    }
