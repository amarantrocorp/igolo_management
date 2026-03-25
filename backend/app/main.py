import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — ensure local uploads directory exists
    if settings.ENVIRONMENT == "local":
        Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Initialize Redis-backed rate limiter (graceful degradation if unavailable)
    redis_client = None
    try:
        import redis.asyncio as aioredis
        from fastapi_limiter import FastAPILimiter

        redis_client = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
        await FastAPILimiter.init(redis_client)
        logger.info("Rate limiter initialized with Redis at %s", settings.REDIS_URL)
    except Exception as exc:
        logger.warning("Redis unavailable — rate limiting disabled: %s", exc)

    yield

    # Shutdown — close Redis connection
    if redis_client is not None:
        try:
            await redis_client.close()
        except Exception:
            pass


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

# GZip compression for responses >= 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trial / subscription enforcement (applied after CORS)
from app.core.trial_middleware import TrialEnforcementMiddleware  # noqa: E402

app.add_middleware(TrialEnforcementMiddleware)

# Tenant schema resolution middleware
from app.core.tenant_middleware import TenantMiddleware  # noqa: E402

app.add_middleware(TenantMiddleware)

# Sentry (optional)
if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)

# Include API routers
from app.api.v1.router import api_router  # noqa: E402

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Serve uploaded files locally in non-production environments
if settings.ENVIRONMENT == "local":
    _upload_path = Path(settings.UPLOAD_DIR)
    _upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(_upload_path)), name="uploads")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
