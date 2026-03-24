"""Tenant resolution middleware.

On every authenticated request, resolves the tenant's schema_name from:
  1. The JWT `org_id` claim (looks up Organization.schema_name), or
  2. An explicit `X-Tenant-ID` header (slug → schema_name lookup)

Stores the resolved schema_name on `request.state.tenant_schema` for use by
the `get_tenant_session` dependency downstream.

Control-plane routes (/platform/*, /auth/*, /health, etc.) are skipped.
"""

import logging
from typing import Optional

from fastapi import Request, Response
from jose import JWTError, jwt
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.config import settings

logger = logging.getLogger(__name__)

# Paths that don't need tenant context
_SKIP_PREFIXES = (
    "/auth/", "/platform/", "/health", "/docs", "/redoc", "/openapi",
    "/uploads/", "/billing/",
)

# In-memory cache: org_id → schema_name  (cleared on restart)
_SCHEMA_CACHE: dict[str, str] = {}


class TenantMiddleware(BaseHTTPMiddleware):
    """Resolve the tenant schema for every request and store on request.state."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        # Skip exempt paths
        if any(
            path.startswith(prefix)
            or path.startswith(f"{settings.API_V1_PREFIX}{prefix}")
            for prefix in _SKIP_PREFIXES
        ):
            request.state.tenant_schema = None
            return await call_next(request)

        # Try to resolve schema
        schema_name = await self._resolve_tenant(request)
        request.state.tenant_schema = schema_name

        return await call_next(request)

    async def _resolve_tenant(self, request: Request) -> Optional[str]:
        """Resolve tenant schema from X-Tenant-ID header or JWT org_id."""

        # Method 1: Explicit X-Tenant-ID header (slug)
        tenant_slug = request.headers.get("x-tenant-id")
        if tenant_slug:
            return await self._schema_from_slug(tenant_slug)

        # Method 2: JWT org_id claim
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            return None

        org_id_str = payload.get("org_id")
        if not org_id_str:
            return None

        return await self._schema_from_org_id(org_id_str)

    async def _schema_from_org_id(self, org_id: str) -> Optional[str]:
        """Look up schema_name by org_id (with cache)."""
        if org_id in _SCHEMA_CACHE:
            return _SCHEMA_CACHE[org_id]

        from app.db.session import AsyncSessionLocal
        from app.models.organization import Organization

        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Organization.schema_name).where(Organization.id == org_id)
                )
                row = result.one_or_none()
                if row and row[0]:
                    _SCHEMA_CACHE[org_id] = row[0]
                    return row[0]
        except Exception:
            logger.exception("TenantMiddleware: failed to resolve schema for org_id=%s", org_id)

        return None

    async def _schema_from_slug(self, slug: str) -> Optional[str]:
        """Look up schema_name by org slug (with cache)."""
        cache_key = f"slug:{slug}"
        if cache_key in _SCHEMA_CACHE:
            return _SCHEMA_CACHE[cache_key]

        from app.db.session import AsyncSessionLocal
        from app.models.organization import Organization

        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Organization.schema_name).where(Organization.slug == slug)
                )
                row = result.one_or_none()
                if row and row[0]:
                    _SCHEMA_CACHE[cache_key] = row[0]
                    return row[0]
        except Exception:
            logger.exception("TenantMiddleware: failed to resolve schema for slug=%s", slug)

        return None


def invalidate_tenant_cache(org_id: str = None, slug: str = None) -> None:
    """Clear the schema cache when an org is updated or deleted."""
    if org_id and org_id in _SCHEMA_CACHE:
        del _SCHEMA_CACHE[org_id]
    if slug:
        cache_key = f"slug:{slug}"
        if cache_key in _SCHEMA_CACHE:
            del _SCHEMA_CACHE[cache_key]
