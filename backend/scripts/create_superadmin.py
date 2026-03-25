"""Create or verify the platform super admin user."""

import asyncio
import sys
from uuid import UUID

from sqlalchemy import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.organization import Organization
from app.models.user import User, UserRole

DEFAULT_ORG_ID = UUID("a0000000-0000-0000-0000-000000000001")


async def main():
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@intdesignerp.com"
    password = sys.argv[2] if len(sys.argv) > 2 else "Admin@123456"

    async with AsyncSessionLocal() as db:
        # Check existing
        result = await db.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(
                f"✅ Admin already exists: {email} (id={existing.id}, active={existing.is_active})"
            )
            return

        # Get or create default org
        org_result = await db.execute(
            select(Organization).where(Organization.id == DEFAULT_ORG_ID)
        )
        org = org_result.scalar_one_or_none()
        if not org:
            org_result = await db.execute(select(Organization).limit(1))
            org = org_result.scalar_one_or_none()
        if not org:
            from uuid import uuid4

            org = Organization(
                id=DEFAULT_ORG_ID, name="Default Organization", slug="default"
            )
            db.add(org)
            await db.flush()
            print(f"  Created org: {org.name}")

        # Create admin
        from uuid import uuid4

        admin = User(
            id=uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            full_name="System Administrator",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            is_platform_admin=True,
        )
        db.add(admin)
        await db.flush()

        # Create membership
        from app.models.organization import OrgMembership

        membership = OrgMembership(
            user_id=admin.id,
            org_id=org.id,
            role=UserRole.SUPER_ADMIN,
            is_default=True,
            is_active=True,
        )
        db.add(membership)
        await db.commit()
        print(f"✅ Admin created: {email} / {password}")
        print(f"   Org: {org.name} ({org.id})")


if __name__ == "__main__":
    asyncio.run(main())
