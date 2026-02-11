"""
Seed script: Creates the first Super Admin user and base data.
Run: python -m app.initial_data
"""
import asyncio
import sys
from pathlib import Path

# Ensure the backend directory is in the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


SEED_CATEGORIES = [
    "Plywood",
    "Laminates",
    "Hardware",
    "Tiles",
    "Adhesives",
    "Paint",
    "Electrical",
    "Plumbing",
    "Glass",
    "Fabric",
    "Stone",
    "Cement",
    "Sand",
    "Steel",
    "Miscellaneous",
]


async def seed_super_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == "admin@intdesignerp.com")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print("Super Admin already exists. Skipping.")
            return

        admin = User(
            email="admin@intdesignerp.com",
            hashed_password=get_password_hash("Admin@123456"),
            full_name="System Administrator",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Super Admin created: admin@intdesignerp.com (password: Admin@123456)")


async def main():
    print("--- IntDesignERP: Seeding Initial Data ---")
    await seed_super_admin()
    print("--- Seeding Complete ---")


if __name__ == "__main__":
    asyncio.run(main())
