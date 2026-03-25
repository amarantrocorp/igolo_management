# Roles & Permissions Guide

Igolo Interior ERP uses a layered Role-Based Access Control (RBAC) system.
Every user belongs to one or more **organizations**, and their role is
determined per-organization through the `OrgMembership` record -- not by a
single global field. A separate **Platform Admin** flag grants cross-org
super-powers that sit above the normal 7 roles.

---

## Table of Contents

1. [Key Concepts](#key-concepts)
2. [Role Definitions](#role-definitions)
   - [SUPER_ADMIN](#super_admin--organization-owner)
   - [MANAGER](#manager--project-manager)
   - [SALES](#sales--sales-executive)
   - [BDE](#bde--business-development-executive)
   - [SUPERVISOR](#supervisor--site-supervisor)
   - [CLIENT](#client--external-client)
   - [LABOR_LEAD](#labor_lead--team-leader)
3. [Platform Admin vs Org Admin](#platform-admin-vs-org-admin)
4. [Multi-Org Membership](#multi-org-membership)
5. [Permission Matrix](#permission-matrix)
6. [Creating Users & Assigning Roles](#creating-users--assigning-roles)
7. [How Role Guards Work](#how-role-guards-work)

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **UserRole enum** | Seven values defined in `backend/app/models/user.py`: `SUPER_ADMIN`, `MANAGER`, `BDE`, `SALES`, `SUPERVISOR`, `CLIENT`, `LABOR_LEAD`. |
| **OrgMembership** | A join table (`org_memberships`) linking a `User` to an `Organization` with a specific `role`. One user can have different roles in different orgs. |
| **is_platform_admin** | A boolean flag on the `User` model. Platform admins bypass all org-level role checks and are treated as `SUPER_ADMIN` in any org context. |
| **AuthContext** | The backend security object returned by `get_auth_context()`. Contains `user`, `org_id`, `role`, and `schema_name`. Every protected endpoint receives this. |
| **Tenant isolation** | Each organization has its own PostgreSQL schema. The `schema_name` on `Organization` determines which schema is set on the DB session via `get_tenant_session()`. |

---

## Role Definitions

### SUPER_ADMIN -- Organization Owner

**Purpose:** Full administrative control of the organization. This is the
company owner or director-level user who configures the system and has
unrestricted access to all data.

#### What they CAN do

- Manage all users within the org (create, update, deactivate, change roles)
- Invite new members to the organization
- Remove members from the organization
- Update organization settings (name, logo, address, GST)
- View and manage subscription billing
- Create, view, finalize, approve, and reject quotations
- Convert approved quotations into live projects
- Convert qualified leads into client accounts
- Manage full project lifecycle (update status, sprints, VOs)
- Access all financial data (wallets, transactions, P&L, financial health)
- Verify pending transactions
- Create and manage budget line items
- Export financial, payroll, and inventory data as CSV
- Create and manage inventory items, vendors, and purchase orders
- Receive purchase orders (GRN)
- Issue stock to projects
- Create and manage labor teams and workers
- Approve weekly payroll
- View labor productivity analytics
- View vendor performance analytics
- Create, view, and delete approval rules
- Process approval requests (approve/reject)
- Create material requests and approve/reject/fulfill them
- Generate and download PDFs (quotations, purchase orders)
- Create payment orders (Razorpay) and verify payments
- Manage org settings and view usage metrics
- Access the Settings and Billing pages
- View reports and dashboards

#### What they CANNOT do

- Access Platform Admin endpoints (unless `is_platform_admin` is true)
- Access other organizations' data (tenant isolation enforced)

#### Typical daily workflow

1. Review the dashboard for project health, overdue sprints, and pending approvals.
2. Check notifications for approval requests (POs, payroll, material indents).
3. Approve or reject quotations submitted by the Sales team.
4. Convert approved quotes into projects, triggering sprint generation.
5. Review financial health across active projects (burn rate, wallet balances).
6. Verify pending transactions (bank transfers, cheques).
7. Approve weekly payroll for labor teams.
8. Manage team members -- invite new staff, change roles as needed.
9. Review reports and export data for accounting.

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Main Menu | Dashboard, Lead Management, Client Requirements, Site Survey, Design Concepts, Drawings, Smart Quotation, BOQ & Estimates, Budget Approval, Projects, Material Planning, Vendors, Purchasing, Labour Management, Execution Tracking, Expenses, Client Billing, Reports, Notifications, Settings, Org Settings, Billing |

---

### MANAGER -- Project Manager

**Purpose:** Oversees project execution, approves expenditures, and manages
day-to-day operations. Has broad access but cannot modify system-level settings
or manage user accounts.

#### What they CAN do

- View and manage leads (create, update, list)
- Convert qualified leads into client accounts
- Create, view, finalize, and approve/reject quotations
- Convert approved quotations into projects
- Update project details (status, manager, supervisor, site address)
- Update sprint dates (triggers the Ripple Date Update cascade)
- Create and review daily site logs
- Create and approve/reject variation orders
- Access project financial health, wallets, transactions, and P&L
- Verify pending transactions
- Create and manage budget line items
- Record financial transactions
- Create and manage inventory items, vendors, and purchase orders
- Receive purchase orders (GRN) and issue stock
- Create and manage labor teams and workers
- Log attendance
- View and approve weekly payroll
- View labor productivity and vendor performance analytics
- Process approval requests (approve/reject)
- Approve, reject, and fulfill material requests
- View approval rules (but not create or delete them)
- View org settings, members, usage, and billing info
- Generate and download PDFs
- Export CSV reports
- Create payment orders and verify payments

#### What they CANNOT do

- Create, update, or deactivate user accounts
- Invite or remove organization members
- Change member roles
- Update organization settings
- Create or delete approval rules
- Access Settings or Billing pages in the sidebar
- Access Platform Admin section

#### Typical daily workflow

1. Check dashboard for project statuses and overdue tasks.
2. Review new leads and assign them to Sales/BDE staff.
3. Review quotations submitted by Sales -- approve or request revisions.
4. Convert approved quotations into live projects.
5. Monitor sprint timelines; adjust dates when site conditions change.
6. Review and approve material indent requests from Supervisors.
7. Approve pending purchase orders and verify delivered goods.
8. Review weekly payroll submissions and approve labor payments.
9. Check financial health across projects -- flag any in the "red zone."
10. Review daily progress logs and site photos from Supervisors.

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Main Menu | Dashboard, Lead Management, Client Requirements, Site Survey, Design Concepts, Drawings, Smart Quotation, BOQ & Estimates, Budget Approval, Projects, Material Planning, Vendors, Purchasing, Labour Management, Execution Tracking, Expenses, Client Billing, Reports, Notifications, Org Settings |

---

### SALES -- Sales Executive

**Purpose:** Handles the pre-sales process from lead qualification through
quotation creation. Can prepare and send quotes but cannot approve them or
convert them into projects.

#### What they CAN do

- Create, view, and update leads
- Log lead activities (calls, emails, meetings, site visits)
- View lead activity history
- Create quotations in DRAFT status with nested rooms and items
- Finalize draft quotations (freeze as versioned snapshot)
- Set quotation status to SENT or DRAFT
- Send quotation PDFs to clients via email
- Download quotation PDFs
- View quotation details and list quotations
- View inventory items (for building quotes)
- View vendors and vendor details
- View purchase orders
- Record financial transactions (e.g., client payment receipts)
- View project list and details (read-only context)
- View budget vs actual reports

#### What they CANNOT do

- Approve or reject quotations (status APPROVED/REJECTED/ARCHIVED requires MANAGER or SUPER_ADMIN)
- Convert quotations into projects
- Convert leads into clients
- Manage inventory (create/update items, vendors, POs)
- Access financial health, P&L, or transaction verification
- Log attendance or manage labor
- Approve material requests
- Access Budget Approval, Material Planning, Purchasing, Expenses, or Reports pages
- Manage users or org settings

#### Typical daily workflow

1. Review assigned leads and check for new ones.
2. Contact leads -- log call/email activities.
3. Qualify leads (update status from NEW to QUALIFIED).
4. Build quotations for qualified leads using the Quote Builder.
5. Finalize and send quotations to clients.
6. Follow up on sent quotations -- log negotiations.
7. Escalate ready-to-approve quotes to Manager.
8. Record client payment receipts when received.

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Main Menu | Dashboard, Lead Management, Client Requirements, Smart Quotation, BOQ & Estimates, Notifications |

---

### BDE -- Business Development Executive

**Purpose:** Focuses exclusively on lead generation and initial contact. This
is the top-of-funnel role responsible for filling the sales pipeline.

#### What they CAN do

- Create new leads
- View and update existing leads
- Log lead activities (calls, emails, meetings, notes, site visits)
- View lead activity history
- View quotations (read-only, for context on lead status)
- View inventory items (read-only)
- View vendors (read-only)
- View purchase orders (read-only)

#### What they CANNOT do

- Create or modify quotations
- Approve or reject anything
- Convert leads to clients
- Access projects, finances, or labor management
- Manage inventory, vendors, or purchase orders
- Access any admin or settings pages
- View financial data of any kind

#### Typical daily workflow

1. Source new leads from website inquiries, referrals, and marketing campaigns.
2. Create lead records in the CRM with contact details and source.
3. Make initial contact calls -- log activities.
4. Qualify or disqualify leads based on budget and requirements.
5. Hand off qualified leads to Sales team (update assigned_to).
6. Follow up on stale leads to re-engage.

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Main Menu | Dashboard, Lead Management, Client Requirements, Smart Quotation, BOQ & Estimates, Notifications |

---

### SUPERVISOR -- Site Supervisor

**Purpose:** On-site execution role. Logs daily progress, marks attendance, and
submits material indent requests. Has no access to CRM, quotations, or
financial data.

#### What they CAN do

- View project list and project details
- Create daily progress logs (notes, photos, blockers)
- View daily progress logs
- Log labor attendance for teams on-site
- View attendance records
- Create material indent requests (request items from warehouse)
- View material request status
- Issue stock from warehouse to project
- View project materials (POs and stock issues linked to project)
- View inventory items and stock history (read-only)
- View vendors and purchase orders (read-only)
- View labor teams and workers
- Record financial transactions (e.g., petty cash expenses)
- View site survey, design concepts, and drawings pages
- View budget line items and budget vs actual

#### What they CANNOT do

- Access or manage leads or the CRM pipeline
- Create, view, or manage quotations
- Convert leads to clients or quotes to projects
- Approve or reject anything (material requests, payroll, POs)
- Access financial health, P&L, or transaction verification
- View financial summary, aggregation, or breakdown reports
- Manage inventory items, vendors, or purchase orders
- Manage labor teams or workers (create/update)
- Approve payroll
- Access admin pages, user management, or org settings
- Export CSV reports

#### Typical daily workflow

1. Arrive at site; open the project dashboard on mobile.
2. Mark attendance for labor teams present (headcount, hours, site photo).
3. Review assigned tasks for the current sprint.
4. Log daily progress -- describe completed work and upload photos.
5. Flag any blockers (material shortage, client design change).
6. Submit material indent requests for items needed on site.
7. Issue approved stock from the warehouse to the project.
8. End of day: final log entry summarizing work completed.

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Main Menu | Dashboard, Site Survey, Design Concepts, Drawings, Projects, Labour Management, Execution Tracking, Notifications |

---

### CLIENT -- External Client

**Purpose:** Read-only access to their own project status. Can view progress
updates, sprint timelines, and make payments through the Razorpay gateway. Uses
a separate login portal at `/client-login`.

#### What they CAN do

- View their own project details (status, sprints, timeline)
- View daily progress logs marked `visible_to_client`
- View variation orders on their project
- View project wallet balance
- View project transactions
- View project documents
- View budget vs actual for their project
- Make payments via Razorpay (create order + verify payment)
- View purchase orders linked to their project (read-only)

#### What they CANNOT do

- Access any other client's project data
- View internal daily logs (those not flagged visible_to_client)
- Access the CRM, leads, or quotation systems
- Manage inventory, labor, or vendors
- View financial health, P&L, or company-wide reports
- Approve or reject anything
- Access any admin or settings pages
- Use the standard `/login` portal (redirected to `/client-login`)

#### Typical daily workflow

1. Log in via the Client Portal (`/client-login`).
2. Check project overview -- current sprint status and expected timeline.
3. View recent site photos and progress updates shared by the team.
4. Review any new variation orders and their cost impact.
5. Check wallet balance and pending payment milestones.
6. Make a milestone payment via Razorpay when due.
7. Download project documents (contracts, receipts).

#### Sidebar pages visible

| Section | Pages |
|---------|-------|
| Client Portal | My Projects, Payments |

---

### LABOR_LEAD -- Team Leader

**Purpose:** Minimal-access role for labor team leaders. Can view their
assigned tasks and update task completion status. This is the most restricted
internal role.

#### What they CAN do

- View assigned project tasks
- Update task status (mark work as complete)
- View project details (limited to assigned projects)
- View their team's attendance records

#### What they CANNOT do

- Access CRM, leads, or quotations
- Create or manage inventory, vendors, or POs
- Access financial data of any kind
- Log attendance (that is the Supervisor's job)
- Submit material requests
- Approve or reject anything
- Access any admin, settings, or reporting pages

#### Typical daily workflow

1. Check assigned tasks for the day.
2. Coordinate with team members on task execution.
3. Update task status as work items are completed.
4. Report blockers to the Supervisor verbally or via the app.

#### Sidebar pages visible

This role does not currently have dedicated sidebar entries. LABOR_LEAD users
are not included in any of the sidebar role groups (`ADMIN_ROLES`, `SALES_ROLES`,
`OPS_ROLES`, `ALL_INTERNAL`). Future iterations may add a dedicated "My Tasks"
section.

---

## Platform Admin vs Org Admin

The system distinguishes between two levels of administrative authority:

| Attribute | Platform Admin | Org Admin (SUPER_ADMIN) |
|-----------|---------------|------------------------|
| **Scope** | All organizations on the platform | Single organization |
| **Identified by** | `User.is_platform_admin = true` | `OrgMembership.role = SUPER_ADMIN` |
| **User management** | Can add/remove members in any org | Can invite/remove members in own org |
| **Org management** | Can create, suspend, activate, delete organizations | Cannot create organizations |
| **Plan management** | Can change any org's plan tier | Cannot change plan tier |
| **Role bypass** | Bypasses all `role_required()` checks -- always treated as SUPER_ADMIN | Subject to normal role checks |
| **Sidebar** | Sees the Platform section (Organizations, All Users, Revenue, Settings) | Sees the standard Main Menu |
| **API prefix** | `/api/v1/platform/*` | `/api/v1/org/*` and all standard endpoints |
| **Guard** | `_require_platform_admin` (checks `User.is_platform_admin`) | `role_required(["SUPER_ADMIN"])` |

**How it works in practice:**

When `get_auth_context()` resolves the user's role, it first checks
`User.is_platform_admin`. If true, the function returns an `AuthContext` with
`role=UserRole.SUPER_ADMIN` without looking up `OrgMembership`. The
`role_required()` dependency also short-circuits for platform admins, allowing
them through any role gate.

Platform admin endpoints under `/api/v1/platform/` use a separate guard
(`_require_platform_admin`) that directly checks the boolean flag rather than
relying on org membership.

---

## Multi-Org Membership

A single user account (identified by email) can belong to multiple
organizations simultaneously. Each membership carries its own role.

**How it works:**

- The `OrgMembership` table has a unique constraint on `(user_id, org_id)` --
  one membership per user per org.
- Each membership has a `role` field and an `is_default` flag.
- When a user logs in, the JWT token includes an `org_id` claim. The frontend
  provides an **Org Switcher** component that lets users change their active
  organization.
- The `roleInOrg` value in the frontend auth store reflects the user's role in
  the currently selected org. Switching orgs may change the user's effective
  role and therefore the sidebar items and accessible pages.

**Example scenario:**

| User | Org A | Org B |
|------|-------|-------|
| Priya | SUPER_ADMIN | MANAGER |
| Rahul | SALES | SALES |
| Client Kapoor | -- | CLIENT |

When Priya switches from Org A to Org B, her sidebar changes from the full
admin view to the Manager view, and she loses access to user management and
settings endpoints for Org B.

---

## Permission Matrix

A comprehensive view of which roles can access which features. The matrix is
derived from the actual `role_required()` decorators on backend endpoints and
the `roles` arrays in the frontend sidebar configuration.

### CRM & Pre-Sales

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create leads | Y | Y | Y | Y | -- | -- | -- |
| View/update leads | Y | Y | Y | Y | -- | -- | -- |
| Log lead activities | Y | Y | Y | Y | -- | -- | -- |
| Convert lead to client | Y | Y | -- | -- | -- | -- | -- |

### Quotations

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create quotation | Y | Y | Y | -- | -- | -- | -- |
| View/list quotations | Y | Y | Y | Y | -- | -- | -- |
| Finalize quotation | Y | Y | Y | -- | -- | -- | -- |
| Set status SENT/DRAFT | Y | Y | Y | -- | -- | -- | -- |
| Approve/reject quotation | Y | Y | -- | -- | -- | -- | -- |
| Send quote to client | Y | Y | Y | -- | -- | -- | -- |
| Download quote PDF | Y | Y | Y | -- | -- | -- | -- |

### Projects

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Convert quote to project | Y | Y | -- | -- | -- | -- | -- |
| View/list projects | Y | Y | Y | Y | Y | Own only | Assigned only |
| Update project details | Y | Y | -- | -- | -- | -- | -- |
| Update sprint dates | Y | Y | -- | -- | -- | -- | -- |
| Create daily logs | Y | Y | -- | -- | Y | -- | -- |
| View daily logs | Y | Y | Y | Y | Y | Visible only | -- |
| Create variation orders | Y | Y | Y | Y | Y | Y | -- |
| Approve/reject VOs | Y | Y | -- | -- | -- | -- | -- |
| View project materials | Y | Y | -- | -- | Y | -- | -- |
| Upload project documents | Y | Y | Y | Y | Y | Y | -- |
| Delete project documents | Y | Y | -- | -- | -- | -- | -- |

### Inventory & Procurement

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create/update items | Y | Y | -- | -- | -- | -- | -- |
| View items | Y | Y | Y | Y | Y | -- | -- |
| Create/update vendors | Y | Y | -- | -- | -- | -- | -- |
| View vendors | Y | Y | Y | Y | Y | -- | -- |
| Create purchase orders | Y | Y | -- | -- | -- | -- | -- |
| View purchase orders | Y | Y | Y | Y | Y | -- | -- |
| Receive PO (GRN) | Y | Y | -- | -- | -- | -- | -- |
| Issue stock to project | Y | Y | -- | -- | Y | -- | -- |
| Download PO PDF | Y | Y | -- | -- | -- | -- | -- |
| Manage item suppliers | Y | Y | -- | -- | -- | -- | -- |
| Vendor performance analytics | Y | Y | -- | -- | -- | -- | -- |

### Material Requests (Indents)

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create material request | Y | Y | -- | -- | Y | -- | -- |
| View material requests | Y | Y | Y | Y | Y | -- | -- |
| Approve/reject requests | Y | Y | -- | -- | -- | -- | -- |
| Fulfill requests | Y | Y | -- | -- | -- | -- | -- |

### Labor & Payroll

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create/update labor teams | Y | Y | -- | -- | -- | -- | -- |
| View labor teams | Y | Y | Y | Y | Y | -- | -- |
| Add workers to teams | Y | Y | -- | -- | -- | -- | -- |
| Log attendance | Y | Y | -- | -- | Y | -- | -- |
| View attendance | Y | Y | -- | -- | Y | -- | -- |
| View payroll summary | Y | Y | -- | -- | -- | -- | -- |
| Approve payroll | Y | Y | -- | -- | -- | -- | -- |
| Labor productivity analytics | Y | Y | -- | -- | -- | -- | -- |

### Finance

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| View financial health | Y | Y | -- | -- | -- | -- | -- |
| View project wallet | Y | Y | Y | Y | Y | Y | -- |
| Record transactions | Y | Y | Y | -- | Y | -- | -- |
| Verify transactions | Y | Y | -- | -- | -- | -- | -- |
| View transaction summary | Y | Y | -- | -- | -- | -- | -- |
| View aggregation/breakdown | Y | Y | -- | -- | -- | -- | -- |
| List all transactions | Y | Y | Y | Y | Y | -- | -- |
| List project transactions | Y | Y | Y | Y | Y | Y | -- |
| Create/manage budgets | Y | Y | -- | -- | -- | -- | -- |
| View budget vs actual | Y | Y | Y | Y | Y | Y | -- |
| View project P&L | Y | Y | -- | -- | -- | -- | -- |
| Export CSV (txns/payroll/inv) | Y | Y | -- | -- | -- | -- | -- |

### Payments (Razorpay)

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create payment order | Y | Y | -- | -- | -- | Y | -- |
| Verify payment | Y | Y | -- | -- | -- | Y | -- |

### Approvals

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| Create approval rules | Y | -- | -- | -- | -- | -- | -- |
| View approval rules | Y | Y | -- | -- | -- | -- | -- |
| Delete approval rules | Y | -- | -- | -- | -- | -- | -- |
| Initiate approval chain | Y | Y | Y | Y | Y | Y | -- |
| Process approvals | Y | Y | -- | -- | -- | -- | -- |
| View pending approvals | Y | Y | Y | Y | Y | Y | -- |

### Organization Management

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| View org settings | Y | Y | -- | -- | -- | -- | -- |
| Update org settings | Y | -- | -- | -- | -- | -- | -- |
| List org members | Y | Y | -- | -- | -- | -- | -- |
| Invite members | Y | -- | -- | -- | -- | -- | -- |
| Remove members | Y | -- | -- | -- | -- | -- | -- |
| Change member roles | Y | -- | -- | -- | -- | -- | -- |
| View usage metrics | Y | Y | -- | -- | -- | -- | -- |
| View billing info | Y | Y | -- | -- | -- | -- | -- |

### User Management

| Action | SUPER_ADMIN | MANAGER | SALES | BDE | SUPERVISOR | CLIENT | LABOR_LEAD |
|--------|:-----------:|:-------:|:-----:|:---:|:----------:|:------:|:----------:|
| List all users | Y | -- | -- | -- | -- | -- | -- |
| Create users | Y | -- | -- | -- | -- | -- | -- |
| Update users | Y | -- | -- | -- | -- | -- | -- |
| Deactivate users | Y | -- | -- | -- | -- | -- | -- |

---

## Creating Users & Assigning Roles

### Method 1: Invitation (Recommended)

The standard way to add team members to an organization:

1. **SUPER_ADMIN** navigates to **Org Settings** in the sidebar.
2. Clicks **Invite Member**.
3. Enters the invitee's email address and selects a role from the dropdown.
4. The system creates an `OrgInvitation` record with a unique token and sends
   an email.
5. The invitee clicks the link, which routes to `/accept-invite?token=...`.
6. If the invitee already has an account, they are added to the org with the
   specified role. If not, they complete registration first.

**API:** `POST /api/v1/org/invite`
**Required role:** `SUPER_ADMIN`

### Method 2: Direct User Creation (Admin Only)

For SUPER_ADMIN users who need to create accounts immediately:

1. Navigate to **Admin > Users** (only visible to SUPER_ADMIN).
2. Click **Create User**.
3. Fill in email, full name, phone, role, and password.
4. The user is created and added to the current org with the specified role.

**API:** `POST /api/v1/users/create`
**Required role:** `SUPER_ADMIN`

### Method 3: Lead-to-Client Conversion

Client accounts are created automatically when a lead is converted:

1. A **MANAGER** or **SUPER_ADMIN** selects a qualified lead.
2. Clicks **Convert to Client**.
3. The system creates a `User` record with `CLIENT` role, a `Client` record
   linked to the original lead, and an `OrgMembership`.

**API:** `POST /api/v1/crm/leads/{lead_id}/convert`
**Required role:** `MANAGER`, `SUPER_ADMIN`

### Method 4: Platform Admin

Platform admins can add members to any organization:

**API:** `POST /api/v1/platform/organizations/{org_id}/members`
**Required:** `User.is_platform_admin = true`

### Changing a User's Role

Only SUPER_ADMIN can change a member's role within the org. A user cannot
change their own role.

**API:** `PATCH /api/v1/org/members/{user_id}/role`
**Required role:** `SUPER_ADMIN`

---

## How Role Guards Work

The RBAC system is enforced at two layers: the backend API and the frontend UI.

### Backend: `role_required()` Dependency

Every protected endpoint declares which roles are allowed using the
`role_required()` FastAPI dependency, defined in `backend/app/core/security.py`.

**How it works:**

1. The dependency extracts the JWT token from the `Authorization` header.
2. It decodes the token and retrieves the `user_id` and `org_id` claims.
3. It loads the `User` from the database and checks `is_active`.
4. If `User.is_platform_admin` is true, it returns immediately with
   `role=SUPER_ADMIN` -- bypassing all further checks.
5. Otherwise, it queries `OrgMembership` for the user + org combination.
6. If no active membership exists, it raises `403 Forbidden`.
7. If the membership's role is not in the `allowed_roles` list, it raises
   `403 Forbidden`.
8. On success, it returns an `AuthContext` object containing `user`, `org_id`,
   `role`, and `schema_name`.

**Usage in routes:**

```python
# Only MANAGER and SUPER_ADMIN can convert quotes to projects
@router.post("/convert/{quote_id}")
async def convert_quote_to_project(
    ctx: AuthContext = Depends(role_required(["MANAGER", "SUPER_ADMIN"])),
):
    ...
```

**Inline role checks:**

Some endpoints allow a broad set of roles but restrict specific actions within
the handler. For example, the quotation status update endpoint allows SALES,
MANAGER, and SUPER_ADMIN, but SALES users cannot set status to APPROVED,
REJECTED, or ARCHIVED:

```python
restricted_statuses = {"APPROVED", "REJECTED", "ARCHIVED"}
if payload.status in restricted_statuses and ctx.role == "SALES":
    raise HTTPException(status_code=403, detail="...")
```

### Frontend: `RoleGuard` Component

The frontend uses a `RoleGuard` wrapper component
(`frontend/components/auth/role-guard.tsx`) to protect page-level access.

**How it works:**

1. It reads `user` and `roleInOrg` from the Zustand auth store.
2. The effective role is `roleInOrg ?? user?.role`.
3. If the user is not authenticated, it redirects to `/login`.
4. If the effective role is not in the `allowedRoles` array, it redirects to
   `/unauthorized`.
5. Otherwise, it renders the children.

**Usage in pages:**

```tsx
<RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
  <BudgetApprovalPage />
</RoleGuard>
```

### Frontend: `ClientGuard` Component

Clients use a separate guard (`frontend/components/auth/client-guard.tsx`) that:

1. Redirects unauthenticated users to `/client-login` (not `/login`).
2. Redirects non-CLIENT users to `/dashboard`.
3. Only renders children for users with the `CLIENT` role.

### Frontend: Sidebar Filtering

The sidebar (`frontend/components/layout/sidebar.tsx`) filters menu items based
on the user's effective role. Four role group constants control visibility:

| Constant | Roles Included | Used For |
|----------|---------------|----------|
| `ADMIN_ROLES` | SUPER_ADMIN, MANAGER | Budget Approval, Material Planning, Vendors, Purchasing, Expenses, Client Billing, Reports, Org Settings |
| `SALES_ROLES` | SUPER_ADMIN, MANAGER, BDE, SALES | Lead Management, Client Requirements, Smart Quotation, BOQ & Estimates |
| `OPS_ROLES` | SUPER_ADMIN, MANAGER, SUPERVISOR | Site Survey, Design Concepts, Drawings, Projects, Labour Management, Execution Tracking |
| `ALL_INTERNAL` | SUPER_ADMIN, MANAGER, BDE, SALES, SUPERVISOR | Dashboard, Notifications |

Additional items visible only to `SUPER_ADMIN`: Settings, Billing.

The CLIENT role sees only the "Client Portal" section with "My Projects" and
"Payments."

Platform admins see a completely separate sidebar with the "Platform" section
(Organizations, All Users, Revenue, Settings) instead of the standard menu.
