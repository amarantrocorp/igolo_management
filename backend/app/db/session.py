from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=30,
    pool_recycle=300,
    pool_timeout=30,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_tenant_db(schema_name: str) -> AsyncSession:
    """Yield a session with search_path set to the given tenant schema.

    This ensures all queries in the session only interact with
    data in the tenant's isolated schema.
    """
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(text(f'SET search_path TO "{schema_name}", public'))
            yield session
        finally:
            await session.execute(text("SET search_path TO public"))
            await session.close()
