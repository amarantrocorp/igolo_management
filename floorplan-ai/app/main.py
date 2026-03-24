import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .router import router

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Floor Plan AI Analyzer",
    description="Analyzes floor plan images using AI vision models to extract room information",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health():
    provider = settings.AI_PROVIDER.lower()
    model = settings.GEMINI_MODEL if provider == "gemini" else settings.OLLAMA_MODEL

    configured = False
    if provider == "gemini":
        configured = bool(settings.GEMINI_API_KEY)
    elif provider == "ollama":
        configured = bool(settings.OLLAMA_BASE_URL)

    return {
        "status": "ok",
        "provider": provider,
        "model": model,
        "configured": configured,
    }
