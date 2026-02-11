from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.crm.router import router as crm_router
from app.api.v1.quotes.router import router as quotes_router
from app.api.v1.inventory.router import router as inventory_router
from app.api.v1.projects.router import router as projects_router
from app.api.v1.finance.router import router as finance_router
from app.api.v1.labor.router import router as labor_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(crm_router, prefix="/crm", tags=["Sales Pipeline"])
api_router.include_router(quotes_router, prefix="/quotes", tags=["Sales Pipeline"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(projects_router, prefix="/projects", tags=["Project Execution"])
api_router.include_router(finance_router, prefix="/finance", tags=["Finance"])
api_router.include_router(labor_router, prefix="/labor", tags=["Labor"])
from app.api.v1.users.router import router as users_router
api_router.include_router(users_router, prefix="/users", tags=["Users"])
