from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    AuthContext,
    get_auth_context,
    get_tenant_session,
    role_required,
)
from app.models.project import ProjectStatus
from app.models.user import UserRole
from app.schemas.inventory import ProjectMaterialsResponse
from app.schemas.project import (
    DailyLogCreate,
    DailyLogResponse,
    ProjectAssignmentCreate,
    ProjectAssignmentResponse,
    ProjectConvert,
    ProjectResponse,
    ProjectUpdate,
    SprintResponse,
    SprintUpdate,
    TransactionCreate,
    TransactionResponse,
    VariationOrderCreate,
    VariationOrderResponse,
    VariationOrderUpdate,
    WalletResponse,
)
from app.schemas.document import DocumentCreate
from app.core.plan_limits import enforce_project_limit
from app.services import inventory_service, pnl_service, project_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Project Conversion & CRUD
# ---------------------------------------------------------------------------


@router.post(
    "/convert/{quote_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def convert_quote_to_project(
    quote_id: UUID,
    payload: ProjectConvert,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Convert an APPROVED quotation into a live project. This will:
    1. Verify the quotation is in APPROVED status.
    2. Create a Project record linked to the client and quotation.
    3. Auto-generate the 6 standard sprints with calculated dates.
    4. Create an initial ProjectWallet."""
    await enforce_project_limit(ctx.org_id, db)
    # Ensure the payload's quotation_id matches the path parameter
    payload.quotation_id = quote_id
    project = await project_service.convert_quote_to_project(
        data=payload, org_id=ctx.org_id, db=db
    )
    return project


@router.get("", response_model=list[ProjectResponse], status_code=status.HTTP_200_OK)
async def list_projects(
    status_filter: Optional[ProjectStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List projects with optional filters for status."""
    # Supervisors only see projects they are assigned to
    assigned_user_id = ctx.user.id if ctx.role == UserRole.SUPERVISOR else None

    projects = await project_service.get_projects(
        db=db,
        org_id=ctx.org_id,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        assigned_user_id=assigned_user_id,
    )
    return projects


# ---------------------------------------------------------------------------
# My Assigned Projects (must be before /{project_id} routes)
# ---------------------------------------------------------------------------


@router.get(
    "/me/assigned-projects",
    response_model=list[ProjectResponse],
    status_code=status.HTTP_200_OK,
)
async def my_assigned_projects(
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Return all projects the current user is assigned to."""
    return await project_service.get_assigned_projects(
        user_id=ctx.user.id, org_id=ctx.org_id, db=db
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Retrieve a single project with its sprints."""
    project = await project_service.get_project(
        project_id=project_id, org_id=ctx.org_id, db=db
    )
    return project


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
)
async def patch_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Partial update project details."""
    project = await project_service.update_project(
        project_id=project_id, data=payload, org_id=ctx.org_id, db=db
    )
    return project


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update project details (status, manager, supervisor, site address)."""
    project = await project_service.update_project(
        project_id=project_id, data=payload, org_id=ctx.org_id, db=db
    )
    return project


# ---------------------------------------------------------------------------
# Project Assignments
# ---------------------------------------------------------------------------


@router.post(
    "/{project_id}/assignments",
    response_model=ProjectAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_user(
    project_id: UUID,
    payload: ProjectAssignmentCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Assign a user to a project with a specific role."""
    assignment = await project_service.assign_user_to_project(
        project_id=project_id,
        user_id=payload.user_id,
        role=payload.role,
        org_id=ctx.org_id,
        db=db,
    )
    return ProjectAssignmentResponse(
        id=assignment.id,
        project_id=assignment.project_id,
        user_id=assignment.user_id,
        user_name=assignment.user.full_name if assignment.user else "",
        user_email=assignment.user.email if assignment.user else "",
        role=assignment.role,
        is_active=assignment.is_active,
        created_at=assignment.created_at,
    )


@router.get(
    "/{project_id}/assignments",
    response_model=list[ProjectAssignmentResponse],
    status_code=status.HTTP_200_OK,
)
async def list_assignments(
    project_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List all active assignments for a project."""
    return await project_service.list_assignments(
        project_id=project_id, org_id=ctx.org_id, db=db
    )


@router.delete(
    "/{project_id}/assignments/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_assignment(
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Remove a user's assignment from a project."""
    await project_service.remove_assignment(
        project_id=project_id, user_id=user_id, org_id=ctx.org_id, db=db
    )


# ---------------------------------------------------------------------------
# Sprints
# ---------------------------------------------------------------------------


@router.patch(
    "/{project_id}/sprints/{sprint_id}",
    response_model=SprintResponse,
    status_code=status.HTTP_200_OK,
)
async def update_sprint(
    project_id: UUID,
    sprint_id: UUID,
    payload: SprintUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update a sprint (status, end_date, notes). If end_date is changed,
    triggers the Ripple Date Update algorithm to shift all dependent sprints."""
    sprint = await project_service.update_sprint(
        sprint_id=sprint_id, data=payload, org_id=ctx.org_id, db=db
    )
    return sprint


# ---------------------------------------------------------------------------
# Daily Logs
# ---------------------------------------------------------------------------


@router.post(
    "/{project_id}/daily-logs",
    response_model=DailyLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_daily_log(
    project_id: UUID,
    payload: DailyLogCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["SUPERVISOR", "MANAGER", "SUPER_ADMIN", "BDE", "SALES"])),
):
    """Log daily site progress for a project sprint."""
    log = await project_service.create_daily_log(
        project_id=project_id,
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return log


@router.get(
    "/{project_id}/daily-logs",
    response_model=list[DailyLogResponse],
    status_code=status.HTTP_200_OK,
)
async def list_daily_logs(
    project_id: UUID,
    sprint_id: Optional[UUID] = Query(None),
    visible_to_client: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List daily progress logs for a project with optional sprint filter."""
    logs = await project_service.list_daily_logs(
        project_id=project_id,
        org_id=ctx.org_id,
        db=db,
        sprint_id=sprint_id,
        visible_to_client=visible_to_client,
        skip=skip,
        limit=limit,
    )
    return logs


# ---------------------------------------------------------------------------
# Variation Orders
# ---------------------------------------------------------------------------


@router.get(
    "/{project_id}/variation-orders",
    response_model=list[VariationOrderResponse],
    status_code=status.HTTP_200_OK,
)
async def list_variation_orders(
    project_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List variation orders for a project."""
    vos = await project_service.list_variation_orders(
        project_id=project_id, org_id=ctx.org_id, db=db, skip=skip, limit=limit
    )
    return vos


@router.post(
    "/{project_id}/variation-orders",
    response_model=VariationOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_variation_order(
    project_id: UUID,
    payload: VariationOrderCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Create a new Variation Order (VO) for a project. VOs handle changes
    after the main contract is signed."""
    vo = await project_service.create_variation_order(
        project_id=project_id,
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return vo


@router.patch(
    "/{project_id}/variation-orders/{vo_id}",
    response_model=VariationOrderResponse,
    status_code=status.HTTP_200_OK,
)
async def update_variation_order(
    project_id: UUID,
    vo_id: UUID,
    payload: VariationOrderUpdate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Update a Variation Order (approve, reject, or link to a sprint).
    VO work cannot start until VO payment is received."""
    vo = await project_service.update_variation_order(
        vo_id=vo_id, data=payload, org_id=ctx.org_id, db=db
    )
    return vo


# ---------------------------------------------------------------------------
# Materials (POs + Stock Issues)
# ---------------------------------------------------------------------------


@router.get(
    "/{project_id}/materials",
    response_model=ProjectMaterialsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project_materials(
    project_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPERVISOR", "SUPER_ADMIN"])),
):
    """Retrieve all materials (purchase orders + stock issues) linked to a project."""
    return await inventory_service.get_project_materials(
        project_id=project_id, org_id=ctx.org_id, db=db
    )


# ---------------------------------------------------------------------------
# Financials & Transactions
# ---------------------------------------------------------------------------


@router.get(
    "/{project_id}/financial-health",
    response_model=WalletResponse,
    status_code=status.HTTP_200_OK,
)
async def get_project_financial_health(
    project_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Retrieve the financial health (wallet) of a project."""
    wallet = await project_service.get_project_financial_health(
        project_id=project_id, org_id=ctx.org_id, db=db
    )
    return wallet


@router.post(
    "/{project_id}/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    project_id: UUID,
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Record a new financial transaction (money in/out)."""
    transaction = await project_service.create_transaction(
        project_id=project_id,
        data=payload,
        user_id=ctx.user.id,
        org_id=ctx.org_id,
        db=db,
    )
    return transaction


@router.get(
    "/{project_id}/transactions",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_200_OK,
)
async def list_transactions(
    project_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """List financial transactions for a project."""
    transactions = await project_service.list_transactions(
        project_id=project_id, org_id=ctx.org_id, db=db, skip=skip, limit=limit
    )
    return transactions


# ---------------------------------------------------------------------------
# Project P&L
# ---------------------------------------------------------------------------


@router.get(
    "/{project_id}/pnl",
    status_code=status.HTTP_200_OK,
)
async def get_project_pnl(
    project_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Get project P&L (Profit & Loss) statement."""
    return await pnl_service.get_project_pnl(
        project_id=project_id, org_id=ctx.org_id, db=db
    )


# ---------------------------------------------------------------------------
# Project Documents
# ---------------------------------------------------------------------------


@router.post(
    "/{project_id}/documents",
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    project_id: UUID,
    data: DocumentCreate,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Upload/register a document for a project."""
    from app.services import document_service

    return await document_service.create_document(
        project_id, data, ctx.user.id, ctx.org_id, db
    )


@router.get("/{project_id}/documents", status_code=status.HTTP_200_OK)
async def list_documents(
    project_id: UUID,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List all documents for a project."""
    from app.services import document_service

    return await document_service.list_documents(
        project_id, db, org_id=ctx.org_id, category=category
    )


@router.delete(
    "/{project_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    project_id: UUID,
    doc_id: UUID,
    db: AsyncSession = Depends(get_tenant_session),
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    """Delete a project document."""
    from app.services import document_service

    await document_service.delete_document(doc_id, ctx.org_id, db)
