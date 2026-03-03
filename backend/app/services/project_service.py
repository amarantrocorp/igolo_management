from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.email import send_email_fire_and_forget
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.crm import Client
from app.models.notification import NotificationType
from app.models.user import UserRole
from app.models.finance import (
    ProjectWallet,
    Transaction,
)
from app.models.project import (
    DailyLog,
    Project,
    ProjectStatus,
    Sprint,
    SprintStatus,
    VariationOrder,
    VOStatus,
)
from app.models.quotation import QuoteStatus, Quotation
from app.schemas.project import (
    DailyLogCreate,
    ProjectConvert,
    ProjectUpdate,
    SprintUpdate,
    TransactionCreate,
    VariationOrderCreate,
    VariationOrderUpdate,
)


async def convert_quote_to_project(data: ProjectConvert, db: AsyncSession) -> Project:
    """Convert an approved quotation into a project.

    Steps:
    1. Verify the quotation is in APPROVED status.
    2. Create the Project record.
    3. Auto-generate the standard 6 sprints with sequential dates and dependencies.
    4. Create a ProjectWallet with total_agreed_value = quotation total_amount.
    """
    # Fetch and validate the quotation
    result = await db.execute(
        select(Quotation).where(Quotation.id == data.quotation_id)
    )
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise NotFoundException(
            detail=f"Quotation with id '{data.quotation_id}' not found"
        )
    if quotation.status != QuoteStatus.APPROVED:
        raise BadRequestException(
            detail=f"Quotation must be APPROVED to convert. Current status: {quotation.status.value}"
        )

    # Retrieve the client associated with this lead
    from app.models.crm import Client

    client_result = await db.execute(
        select(Client).where(Client.lead_id == quotation.lead_id)
    )
    client = client_result.scalar_one_or_none()
    if not client:
        raise BadRequestException(
            detail="No client record found for this lead. Convert the lead to a client first."
        )

    # Create the Project
    project = Project(
        name=data.name,
        client_id=client.id,
        accepted_quotation_id=quotation.id,
        status=ProjectStatus.NOT_STARTED,
        start_date=data.start_date,
        total_project_value=quotation.total_amount,
        manager_id=data.manager_id,
        supervisor_id=data.supervisor_id,
        site_address=data.site_address,
    )
    db.add(project)
    await db.flush()  # Get the project ID

    # Generate the standard 6 sprints
    sprints = await _generate_standard_sprints(project.id, data.start_date, db)

    # Calculate expected end date from the last sprint
    if sprints:
        project.expected_end_date = sprints[-1].end_date

    # Create the ProjectWallet
    wallet = ProjectWallet(
        project_id=project.id,
        total_agreed_value=quotation.total_amount,
        total_received=Decimal("0.00"),
        total_spent=Decimal("0.00"),
        pending_approvals=Decimal("0.00"),
    )
    db.add(wallet)

    # Ensure the lead is marked as CONVERTED
    from app.models.crm import Lead, LeadStatus

    lead_result = await db.execute(select(Lead).where(Lead.id == quotation.lead_id))
    lead = lead_result.scalar_one_or_none()
    if lead and lead.status != LeadStatus.CONVERTED:
        lead.status = LeadStatus.CONVERTED
        db.add(lead)

    await db.commit()

    # Reload the full project with relationships for notifications
    full_project = await get_project(project.id, db)

    # Notify client about project start
    if full_project.client and full_project.client.user:
        client_user = full_project.client.user
        if client_user.email:
            send_email_fire_and_forget(
                subject=f"Your Project Has Started: {full_project.name}",
                email_to=client_user.email,
                template_name="project_started.html",
                template_data={
                    "subject": f"Your Project Has Started: {full_project.name}",
                    "recipient_name": client_user.full_name,
                    "project_name": full_project.name,
                    "start_date": str(full_project.start_date),
                    "expected_end_date": str(full_project.expected_end_date) if full_project.expected_end_date else None,
                    "action_url": None,
                    "frontend_url": settings.FRONTEND_URL,
                },
            )

    # Notify manager and supervisor
    from app.services.notification_service import create_notification

    if full_project.manager_id:
        await create_notification(
            db=db,
            recipient_id=full_project.manager_id,
            type=NotificationType.INFO,
            title=f"New Project: {full_project.name}",
            body=f"You have been assigned as manager for project '{full_project.name}'.",
            action_url=f"/dashboard/projects/{full_project.id}",
            email_template="project_started.html",
            email_data={
                "project_name": full_project.name,
                "start_date": str(full_project.start_date),
                "expected_end_date": str(full_project.expected_end_date) if full_project.expected_end_date else None,
                "action_url": f"/dashboard/projects/{full_project.id}",
            },
        )
    if full_project.supervisor_id:
        await create_notification(
            db=db,
            recipient_id=full_project.supervisor_id,
            type=NotificationType.INFO,
            title=f"New Project: {full_project.name}",
            body=f"You have been assigned as supervisor for project '{full_project.name}'.",
            action_url=f"/dashboard/projects/{full_project.id}",
            email_template="project_started.html",
            email_data={
                "project_name": full_project.name,
                "start_date": str(full_project.start_date),
                "expected_end_date": str(full_project.expected_end_date) if full_project.expected_end_date else None,
                "action_url": f"/dashboard/projects/{full_project.id}",
            },
        )

    return full_project


async def _generate_standard_sprints(
    project_id: UUID, start_date: date, db: AsyncSession
) -> List[Sprint]:
    """Auto-generate the 6 standard project sprints with sequential dates
    and dependency links between consecutive sprints.
    """
    sprints: List[Sprint] = []
    current_date = start_date
    previous_sprint_id: Optional[UUID] = None

    for index, sprint_config in enumerate(settings.DEFAULT_SPRINTS):
        end_date = current_date + timedelta(days=sprint_config["days"])

        sprint = Sprint(
            project_id=project_id,
            sequence_order=index + 1,
            name=sprint_config["name"],
            status=SprintStatus.PENDING,
            start_date=current_date,
            end_date=end_date,
            dependency_sprint_id=previous_sprint_id,
        )
        db.add(sprint)
        await db.flush()  # Get sprint ID for dependency linking

        sprints.append(sprint)
        previous_sprint_id = sprint.id
        # Next sprint starts the day after this one ends
        current_date = end_date + timedelta(days=1)

    return sprints


async def get_project(project_id: UUID, db: AsyncSession) -> Project:
    """Retrieve a project by ID with sprints eagerly loaded."""
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.sprints),
            selectinload(Project.variation_orders),
            selectinload(Project.wallet),
            selectinload(Project.client).options(
                selectinload(Client.user),
                selectinload(Client.lead),
            ),
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException(detail=f"Project with id '{project_id}' not found")
    return project


async def get_projects(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[ProjectStatus] = None,
) -> List[Project]:
    """Retrieve a paginated list of projects with optional status filter."""
    query = select(Project).options(
        selectinload(Project.sprints),
        selectinload(Project.wallet),
        selectinload(Project.client).options(
            selectinload(Client.user),
            selectinload(Client.lead),
        ),
    )

    if status_filter:
        query = query.where(Project.status == status_filter)

    query = query.order_by(Project.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_project(
    project_id: UUID, data: ProjectUpdate, db: AsyncSession
) -> Project:
    """Update project fields. Only non-None fields are applied."""
    project = await get_project(project_id, db)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_sprint(
    sprint_id: UUID, data: SprintUpdate, db: AsyncSession
) -> Sprint:
    """Update a sprint and apply the Ripple Date Update algorithm.

    If the end_date is changed, calculate the delay and recursively shift
    all dependent (subsequent) sprints forward or backward by the same delta.
    """
    result = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sprint = result.scalar_one_or_none()
    if not sprint:
        raise NotFoundException(detail=f"Sprint with id '{sprint_id}' not found")

    update_data = data.model_dump(exclude_unset=True)

    # Check if end_date is being changed for the ripple effect
    new_end_date = update_data.get("end_date")
    if new_end_date and new_end_date != sprint.end_date:
        delay = new_end_date - sprint.end_date
        sprint.end_date = new_end_date

        # Ripple: shift all dependent sprints
        await _ripple_date_update(sprint.id, delay, sprint.project_id, db)

    # Apply other fields (status, notes)
    for field, value in update_data.items():
        if field != "end_date":  # end_date already handled above
            setattr(sprint, field, value)

    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint


async def _ripple_date_update(
    changed_sprint_id: UUID,
    delay: timedelta,
    project_id: UUID,
    db: AsyncSession,
) -> None:
    """Recursively shift start and end dates of all sprints that depend on
    the changed sprint (directly or transitively).
    """
    # Find all sprints that directly depend on the changed sprint
    result = await db.execute(
        select(Sprint).where(
            Sprint.project_id == project_id,
            Sprint.dependency_sprint_id == changed_sprint_id,
        )
    )
    dependent_sprints = list(result.scalars().all())

    for dep_sprint in dependent_sprints:
        dep_sprint.start_date = dep_sprint.start_date + delay
        dep_sprint.end_date = dep_sprint.end_date + delay
        db.add(dep_sprint)

        # Recursively update sprints that depend on this one
        await _ripple_date_update(dep_sprint.id, delay, project_id, db)


async def create_daily_log(
    project_id: UUID, data: DailyLogCreate, user_id: UUID, db: AsyncSession
) -> DailyLog:
    """Create a daily progress log for a project (used by supervisors)."""
    # Validate project exists
    await get_project(project_id, db)

    daily_log = DailyLog(
        project_id=project_id,
        sprint_id=data.sprint_id,
        logged_by_id=user_id,
        date=data.date,
        notes=data.notes,
        blockers=data.blockers,
        image_urls=data.image_urls,
        visible_to_client=data.visible_to_client,
    )
    db.add(daily_log)
    await db.commit()
    await db.refresh(daily_log)
    return daily_log


async def list_daily_logs(
    project_id: UUID,
    db: AsyncSession,
    sprint_id: Optional[UUID] = None,
    visible_to_client: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[DailyLog]:
    """Retrieve a paginated list of daily logs for a project with optional filters."""
    query = select(DailyLog).where(DailyLog.project_id == project_id)

    if sprint_id is not None:
        query = query.where(DailyLog.sprint_id == sprint_id)

    if visible_to_client is not None:
        query = query.where(DailyLog.visible_to_client == visible_to_client)

    query = query.order_by(DailyLog.date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def list_variation_orders(
    project_id: UUID,
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> List[VariationOrder]:
    """Retrieve a paginated list of variation orders for a project."""
    query = (
        select(VariationOrder)
        .where(VariationOrder.project_id == project_id)
        .order_by(VariationOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_variation_order(
    project_id: UUID,
    data: VariationOrderCreate,
    user_id: UUID,
    db: AsyncSession,
) -> VariationOrder:
    """Create a Variation Order (VO) for additional work after contract signing."""
    # Validate project exists
    await get_project(project_id, db)

    vo = VariationOrder(
        project_id=project_id,
        description=data.description,
        additional_cost=data.additional_cost,
        status=VOStatus.REQUESTED,
        linked_sprint_id=data.linked_sprint_id,
        requested_by_id=user_id,
    )
    db.add(vo)
    await db.commit()
    await db.refresh(vo)

    # Notify managers about new VO
    from app.services.notification_service import notify_role

    await notify_role(
        db=db,
        role=UserRole.MANAGER,
        type=NotificationType.APPROVAL_REQ,
        title=f"New Variation Order: {vo.description[:50]}",
        body=f"A variation order of Rs. {vo.additional_cost} has been requested for project.",
        action_url=f"/dashboard/projects/{project_id}",
        email_template="variation_order.html",
        email_data={
            "project_name": f"Project {str(project_id)[:8]}",
            "vo_description": vo.description,
            "additional_cost": str(vo.additional_cost),
            "vo_status": "REQUESTED",
            "action_url": f"/dashboard/projects/{project_id}",
        },
    )

    return vo


async def update_variation_order(
    vo_id: UUID, data: VariationOrderUpdate, db: AsyncSession
) -> VariationOrder:
    """Update a Variation Order.

    If the status changes to PAID, the project wallet's total_agreed_value and
    total_received are both increased by the VO's additional_cost.
    """
    result = await db.execute(select(VariationOrder).where(VariationOrder.id == vo_id))
    vo = result.scalar_one_or_none()
    if not vo:
        raise NotFoundException(detail=f"Variation Order with id '{vo_id}' not found")

    update_data = data.model_dump(exclude_unset=True)
    old_status = vo.status

    for field, value in update_data.items():
        setattr(vo, field, value)

    # If status changes to PAID, update the wallet
    if (
        "status" in update_data
        and update_data["status"] == VOStatus.PAID
        and old_status != VOStatus.PAID
    ):
        wallet_result = await db.execute(
            select(ProjectWallet).where(ProjectWallet.project_id == vo.project_id)
        )
        wallet = wallet_result.scalar_one_or_none()
        if wallet:
            wallet.total_agreed_value += vo.additional_cost
            wallet.total_received += vo.additional_cost
            db.add(wallet)

    db.add(vo)
    await db.commit()
    await db.refresh(vo)

    # Notify on VO status changes (APPROVED or PAID)
    if (
        "status" in update_data
        and update_data["status"] in (VOStatus.APPROVED, VOStatus.PAID)
    ):
        from app.services.notification_service import notify_role

        await notify_role(
            db=db,
            role=UserRole.MANAGER,
            type=NotificationType.INFO,
            title=f"VO {vo.status.value}: {vo.description[:50]}",
            body=f"Variation order of Rs. {vo.additional_cost} is now {vo.status.value}.",
            action_url=f"/dashboard/projects/{vo.project_id}",
            email_template="variation_order.html",
            email_data={
                "project_name": f"Project {str(vo.project_id)[:8]}",
                "vo_description": vo.description,
                "additional_cost": str(vo.additional_cost),
                "vo_status": vo.status.value,
                "action_url": f"/dashboard/projects/{vo.project_id}",
            },
        )

    return vo


# ---------------------------------------------------------------------------
# Financials & Transactions
# ---------------------------------------------------------------------------


async def get_project_financial_health(
    project_id: UUID, db: AsyncSession
) -> ProjectWallet:
    """Retrieve the project wallet and financial summary."""
    result = await db.execute(
        select(ProjectWallet).where(ProjectWallet.project_id == project_id)
    )
    wallet = result.scalar_one_or_none()
    if not wallet:
        # Should exist if project exists, but safe fallback or 404
        # Check project existence first
        await get_project(project_id, db)
        raise NotFoundException(detail="Project wallet not found")
    return wallet


async def create_transaction(
    project_id: UUID, data: TransactionCreate, user_id: UUID, db: AsyncSession
) -> Transaction:
    """Record a financial transaction via the finance service.

    Delegates to finance_service.create_transaction which:
    - Enforces the spending lock (authorize_expense) for OUTFLOW transactions
    - Creates transactions as PENDING (requires manager verification to CLEAR)
    """
    from app.schemas.finance import TransactionCreate as FinanceTransactionCreate
    from app.services.finance_service import create_transaction as finance_create_txn

    finance_data = FinanceTransactionCreate(
        project_id=project_id,
        category=data.category,
        source=data.source,
        amount=data.amount,
        description=data.description,
        reference_id=data.reference_id,
        proof_doc_url=data.proof_doc_url,
    )
    return await finance_create_txn(data=finance_data, user_id=user_id, db=db)


async def list_transactions(
    project_id: UUID,
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> List[Transaction]:
    """List all financial transactions for a project."""
    query = (
        select(Transaction)
        .where(Transaction.project_id == project_id)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())
