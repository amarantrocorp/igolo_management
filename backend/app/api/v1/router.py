from fastapi import APIRouter

from app.api.v1.auth.router import router as auth_router
from app.api.v1.crm.router import router as crm_router
from app.api.v1.finance.router import router as finance_router
from app.api.v1.inventory.router import router as inventory_router
from app.api.v1.labor.router import router as labor_router
from app.api.v1.projects.router import router as projects_router
from app.api.v1.quotes.router import router as quotes_router
from app.api.v1.notifications.router import router as notifications_router
from app.api.v1.upload.router import router as upload_router
from app.api.v1.users.router import router as users_router
from app.api.v1.material_requests.router import router as material_requests_router
from app.api.v1.quality.router import router as quality_router
from app.api.v1.invoices.router import router as invoices_router
from app.api.v1.approvals.router import router as approvals_router
from app.api.v1.work_orders.router import router as work_orders_router
from app.api.v1.assets.router import router as assets_router
from app.api.v1.vendor_bills.router import router as vendor_bills_router
from app.api.v1.payments.router import router as payments_router
from app.api.v1.billing.router import router as billing_router
from app.api.v1.org.router import router as org_router
from app.api.v1.platform.router import router as platform_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(crm_router, prefix="/crm", tags=["Sales Pipeline"])
api_router.include_router(quotes_router, prefix="/quotes", tags=["Sales Pipeline"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(
    projects_router, prefix="/projects", tags=["Project Execution"]
)
api_router.include_router(finance_router, prefix="/finance", tags=["Finance"])
api_router.include_router(labor_router, prefix="/labor", tags=["Labor"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(upload_router, prefix="/upload", tags=["Upload"])
api_router.include_router(
    notifications_router, prefix="/notifications", tags=["Notifications"]
)
api_router.include_router(
    material_requests_router,
    prefix="/material-requests",
    tags=["Material Requests"],
)
api_router.include_router(
    quality_router, prefix="/quality", tags=["Quality Management"]
)
api_router.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(approvals_router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(
    work_orders_router, prefix="/work-orders", tags=["Work Orders"]
)
api_router.include_router(assets_router, prefix="/assets", tags=["Assets"])
api_router.include_router(
    vendor_bills_router, prefix="/vendor-bills", tags=["Vendor Bills"]
)
api_router.include_router(payments_router, prefix="/payments", tags=["Payments"])
api_router.include_router(billing_router, prefix="/billing", tags=["Billing"])
api_router.include_router(org_router, prefix="/org", tags=["Organization"])
api_router.include_router(platform_router, prefix="/platform", tags=["Platform Admin"])
