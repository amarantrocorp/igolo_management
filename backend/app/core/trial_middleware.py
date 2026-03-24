"""Middleware that enforces subscription / trial status on every request.

Rules:
- TRIAL + expired trial_expires_at  -> 402 "Trial expired. Please upgrade."
- SUSPENDED                         -> 403 "Account suspended. Contact support."
- PAST_DUE                          -> allow GET (read-only), block writes
- ACTIVE / valid TRIAL              -> pass through

Skipped for:
- Unauthenticated routes (no Authorization header)
- /auth/*, /billing/*, /platform/* paths
- Platform admins (is_platform_admin = True)
"""

import logging
from datetime import datetime, timezone

from fastapi import Request, Response
from jose import JWTError, jwt
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

# Paths that bypass subscription checks entirely
_SKIP_PREFIXES = (
    "/auth/",
    "/billing/",
    "/platform/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi",
)


class TrialEnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Skip non-API and exempt paths
        if any(
            path.startswith(prefix)
            or path.startswith(f"{settings.API_V1_PREFIX}{prefix}")
            for prefix in _SKIP_PREFIXES
        ):
            return await call_next(request)

        # Skip if no auth header (let downstream auth handle 401)
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        # Decode JWT to extract org_id and user info
        token = auth_header.removeprefix("Bearer ").strip()
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
        except JWTError:
            # Let downstream auth handle invalid tokens
            return await call_next(request)

        org_id_str = payload.get("org_id")
        if not org_id_str:
            return await call_next(request)

        user_id_str = payload.get("sub")

        # Fetch org subscription status and platform-admin flag from DB
        from app.db.session import AsyncSessionLocal
        from app.models.organization import Organization, SubscriptionStatus
        from app.models.user import User

        try:
            async with AsyncSessionLocal() as db:
                # Check if user is a platform admin (bypasses all subscription checks)
                if user_id_str:
                    user_result = await db.execute(
                        select(User.is_platform_admin).where(User.id == user_id_str)
                    )
                    user_row = user_result.one_or_none()
                    if user_row and user_row[0]:
                        return await call_next(request)

                result = await db.execute(
                    select(
                        Organization.subscription_status,
                        Organization.trial_expires_at,
                    ).where(Organization.id == org_id_str)
                )
                row = result.one_or_none()

            if row is None:
                return await call_next(request)

            sub_status, trial_expires_at = row

            # --- SUSPENDED: block everything ---
            if sub_status == SubscriptionStatus.SUSPENDED:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Account suspended. Contact support."},
                )

            # --- TRIAL + expired ---
            if sub_status == SubscriptionStatus.TRIAL and trial_expires_at:
                now = datetime.now(timezone.utc)
                if now > trial_expires_at:
                    return JSONResponse(
                        status_code=402,
                        content={"detail": "Trial expired. Please upgrade."},
                    )

            # --- PAST_DUE: read-only mode (allow GET/HEAD/OPTIONS, block writes) ---
            if sub_status == SubscriptionStatus.PAST_DUE:
                if request.method not in ("GET", "HEAD", "OPTIONS"):
                    return JSONResponse(
                        status_code=402,
                        content={
                            "detail": "Your subscription is past due. Only read access is available. Please update your payment method."
                        },
                    )

        except Exception:
            # If we can't check subscription, let request through and log
            logger.exception(
                "TrialEnforcementMiddleware: failed to check subscription status"
            )

        return await call_next(request)
