from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — ensure local uploads directory exists
    if settings.ENVIRONMENT != "production":
        Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sentry (optional)
if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)

# Include API routers
from app.api.v1.router import api_router  # noqa: E402

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Serve uploaded files locally in non-production environments
if settings.ENVIRONMENT != "production":
    _upload_path = Path(settings.UPLOAD_DIR)
    _upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(_upload_path)), name="uploads")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
