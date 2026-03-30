# IntDesignERP — Complete System Flow & Data Flow Document

> End-to-end data flow from every user role through every module, covering the full lifecycle:
> **Lead → Quotation → Conversion → Execution → Handover**

---

## 1. System Overview & Multi-Tenancy

IntDesignERP is a **multi-tenant SaaS ERP** for interior design companies.

- Each **Organization** (tenant) has a unique `slug` and isolated data via `org_id` + PostgreSQL schema
- Platform Admin manages all orgs from `/dashboard/platform`
- Each org has its own users, leads, projects, inventory, finances
- **Login flow**: tenant slug resolved from subdomain (`acme.igolohomes.com`), header (`X-Tenant-Slug`), or query param (`?tenant_slug=acme`)
- JWT token contains `user_id` + `org_id` → all queries scoped to that org
- Subscription tiers: **FREE → STARTER → PRO → ENTERPRISE** (enforce limits on leads, projects, users)

---

## 2. User Roles & Responsibilities

| Role | Primary Responsibility | Key Pages |
|------|----------------------|-----------|
| **SUPER_ADMIN** | Platform management, full org access | Platform dashboard, all admin pages, settings |
| **MANAGER** | Project oversight, approvals, financials | Dashboard, projects, approvals, finance, reports |
| **BDE** | Lead generation, initial contact | Lead management, client requirements |
| **SALES** | Lead qualification, quotation creation | Leads, quotations, client requirements |
| **SUPERVISOR** | On-site execution, daily logs, labor attendance | Projects, execution tracking, labour management |
| **CLIENT** | View-only project status, payments | Client portal, payments |
| **LABOR_LEAD** | (Optional) Task status updates | Limited project view |

**Role Groupings:**
- **ADMIN_ROLES**: SUPER_ADMIN, MANAGER
- **SALES_ROLES**: SUPER_ADMIN, MANAGER, BDE, SALES
- **OPS_ROLES**: SUPER_ADMIN, MANAGER, SUPERVISOR
- **ALL_INTERNAL**: SUPER_ADMIN, MANAGER, BDE, SALES, SUPERVISOR

---

## 3. The Complete Lifecycle Flow

### PHASE 0: Platform Setup (Super Admin)

```
Platform Admin logs in at main domain (no tenant slug)
    │
    ├── Creates Organization (name, slug, plan tier)
    │       API: POST /api/v1/platform/organizations
    │
    ├── Invites Users to Organization (email + role)
    │       API: POST /api/v1/platform/organizations/{org_id}/invite
    │       → Sends invitation email with accept link
    │
    ├── Manages Subscriptions & Plan Tiers
    │       API: PATCH /api/v1/platform/organizations/{org_id}/plan
    │
    └── Monitors Platform Health
            Page: /dashboard/platform (MRR, active orgs, user count)
```

---

### PHASE 1: Lead Generation (BDE / Sales)

```
BDE/Sales logs in at tenant subdomain (e.g., acme.igolohomes.com)
    │
    ├── Creates New Lead
    │       API: POST /api/v1/crm/leads
    │       Data: name, contact_number, email, source, property_type,
    │             carpet_area, budget_range, design_style, location
    │       → Lead status: NEW
    │       → Auto-assigned to creator (or specified user)
    │       → Notification sent to assignee (in-app + WhatsApp)
    │       → Plan limit check: enforce_lead_limit(org_id)
    │
    ├── Logs Activities on Lead
    │       API: POST /api/v1/crm/leads/{lead_id}/activities
    │       Types: CALL, EMAIL, MEETING, NOTE, SITE_VISIT
    │       → Each activity timestamped with creator
    │
    ├── Updates Lead Status (drag-drop on Kanban or manual)
    │       API: PUT /api/v1/crm/leads/{lead_id}
    │       Flow: NEW → CONTACTED → QUALIFIED → QUOTATION_SENT
    │             → NEGOTIATION → CONVERTED or LOST
    │
    └── Converts Lead to Client (when ready for quotation)
            API: POST /api/v1/crm/leads/{lead_id}/convert
            → Creates User record (CLIENT role)
            → Creates OrgMembership (user + org)
            → Creates Client record (links User + Lead)
            → Lead status → CONVERTED
            → Welcome email sent with login credentials
```

**Pages used:**
- `/dashboard/sales/leads` — Kanban pipeline + table view
- `/dashboard/sales/leads/new` — Create lead form
- `/dashboard/sales/leads/[id]` — Lead detail + activity log

---

### PHASE 2: Quotation (Sales)

```
Sales creates Quotation for a Lead
    │
    ├── Creates Draft Quotation
    │       API: POST /api/v1/quotes
    │       Data: lead_id, rooms[] → items[] per room
    │       → Status: DRAFT
    │       → Version: auto-incremented per lead (v1, v2, v3...)
    │
    ├── Builds Quote (The "Quote Builder" UI)
    │       For each Room (e.g., "Kitchen", "Master Bedroom"):
    │         For each Item (from inventory catalog):
    │           → Select item → Enter quantity → Enter markup %
    │           → final_price = unit_price × quantity × (1 + markup/100)
    │       → Room total = SUM(item final prices)
    │       → Quote total = SUM(room totals)
    │       → Live calculation in sticky footer
    │
    ├── Finalizes Quotation
    │       API: POST /api/v1/quotes/{id}/finalize
    │       → Status: DRAFT → SENT
    │       → Version number locked
    │       → Lead status → QUOTATION_SENT
    │
    ├── Sends to Client
    │       API: POST /api/v1/quotes/{id}/send
    │       → PDF generated (WeasyPrint + Jinja2 template)
    │       → PDF emailed to client
    │       → WhatsApp notification (if enabled)
    │
    └── Client Response
            API: PATCH /api/v1/quotes/{id}/status
            │
            ├── APPROVED → Ready for project conversion
            │
            └── REJECTED → Sales creates new version
                    → Lead status → NEGOTIATION
                    → Repeat from "Creates Draft Quotation"
```

**Quotation PDF contains:**
- Cover page (project name, client, 3D render, total)
- Room-wise summary table
- Detailed breakdown (item, description, qty, unit price, total)
- Payment schedule (milestone-based)
- Terms & conditions

**Pages used:**
- `/dashboard/sales/quotes` — Quote list with status filters
- `/dashboard/sales/quotes/new` — Create from lead
- `/dashboard/sales/quotes/[id]` — Quote detail, finalize, send, approve/reject

---

### PHASE 3: Project Conversion (Manager)

```
Manager converts approved Quotation to Project
    │
    API: POST /api/v1/projects/convert/{quote_id}
    │
    Prerequisites:
    │  ✓ Quotation status must be APPROVED
    │  ✓ Client record must exist for the lead
    │  ✓ Plan limit check: enforce_project_limit(org_id)
    │
    System auto-creates:
    │
    ├── 1. Project Record
    │       Links: client_id, accepted_quotation_id, manager_id, supervisor_id
    │       Status: NOT_STARTED
    │       Financial: total_project_value = quotation.total_amount
    │
    ├── 2. Six Standard Sprints (sequential dependencies)
    │       ┌────┬──────────────────────────────┬──────────┬─────────────┐
    │       │ #  │ Sprint Name                  │ Duration │ Depends On  │
    │       ├────┼──────────────────────────────┼──────────┼─────────────┤
    │       │ 1  │ Design & Approvals           │ 10 days  │ None        │
    │       │ 2  │ Civil & Demolition           │ 15 days  │ Sprint 1    │
    │       │ 3  │ MEP (Electrical/Plumbing)    │ 10 days  │ Sprint 2    │
    │       │ 4  │ Woodwork & Carpentry         │ 25 days  │ Sprint 3    │
    │       │ 5  │ Finishing & Painting         │ 12 days  │ Sprint 4    │
    │       │ 6  │ Handover & Snag List         │  5 days  │ Sprint 5    │
    │       └────┴──────────────────────────────┴──────────┴─────────────┘
    │       Total default duration: 77 days
    │       Each sprint starts the day after the previous ends
    │
    ├── 3. Project Wallet
    │       total_agreed_value = quotation.total_amount
    │       total_received = 0
    │       total_spent = 0
    │       pending_approvals = 0
    │
    ├── 4. Quotation → ARCHIVED (prevent re-use)
    │
    ├── 5. Lead → CONVERTED
    │
    └── 6. Notifications sent to:
            → Manager (project assigned)
            → Supervisor (project assigned)
            → Client (project started email)
```

**Pages used:**
- `/dashboard/projects` — Project list
- `/dashboard/projects/[id]` — Project detail (sprints, finance, materials, logs)

---

### PHASE 4: Execution (Supervisor + Manager)

This phase runs in parallel across multiple sub-flows:

#### 4A. Sprint Management

```
Each Sprint: PENDING → ACTIVE → COMPLETED / DELAYED
    │
    ├── Manager activates sprints sequentially
    │       API: PATCH /api/v1/projects/{id}/sprints/{sprint_id}
    │
    ├── Supervisor logs daily progress
    │       API: POST /api/v1/projects/{id}/daily-logs
    │       Data: sprint_id, notes, images[], blockers[]
    │       → Manager can toggle visible_to_client per log
    │
    ├── Manager adjusts timeline (if delays)
    │       API: PATCH /api/v1/projects/{id}/sprints/{sprint_id}
    │       → RIPPLE DATE ENGINE activates:
    │         1. delay = new_end_date - old_end_date
    │         2. Find all dependent sprints (recursively)
    │         3. Shift start_date and end_date by delay
    │         4. Final handover date automatically pushed
    │
    └── Quality inspections & snag tracking
            API: POST /api/v1/quality/inspections
            API: POST /api/v1/quality/snags
```

#### 4B. Material & Inventory Flow

```
Supervisor identifies material need on site
    │
    ├── Raises Material Request (Indent)
    │       API: POST /api/v1/material-requests (or admin/material-requests)
    │       Data: item_id, quantity, project_id, sprint_id, urgency
    │       → Status: PENDING
    │       → Notification to Manager
    │
    ├── Manager Approves Request
    │       → Status: APPROVED
    │
    ├── Admin Creates Purchase Order (PO)
    │       API: POST /api/v1/inventory/purchase-orders
    │       Data: vendor_id, items[], is_project_specific, project_id
    │       → Status: DRAFT → ORDERED
    │       → PO PDF generated and sent to vendor
    │
    ├── Goods Received (GRN)
    │       API: PATCH /api/v1/inventory/purchase-orders/{po_id}
    │       → Status: ORDERED → RECEIVED
    │       │
    │       ├── IF General Stock:
    │       │     Item.current_stock += quantity
    │       │     StockTransaction created (PURCHASE_IN)
    │       │
    │       └── IF Project-Specific:
    │             Item.current_stock unchanged (never enters warehouse)
    │             Expense booked directly to Project Wallet
    │             StockTransaction created (for audit trail)
    │
    ├── Vendor Bill Reconciliation
    │       API: POST /api/v1/vendor-bills
    │       → Upload vendor invoice (image/PDF)
    │       → Compare PO price vs actual bill price
    │       → IF variance > 10%: Price Alert to Manager
    │       → Update Item.base_price (last purchase price)
    │
    └── Stock Issue to Project (from General Stock)
            → StockTransaction created (PROJECT_ISSUE)
            → Item.current_stock -= quantity
            → Cost booked to Project Wallet
```

**Low stock alert:** Items where `current_stock < reorder_level` are highlighted red in the inventory grid.

#### 4C. Labor Management Flow

```
Admin sets up Labor Teams
    │
    ├── Create Labor Team
    │       API: POST /api/v1/labor/teams
    │       Data: name, leader_name, specialization, payment_model, daily_rate
    │       Specializations: CIVIL, CARPENTRY, PAINTING, ELECTRICAL, PLUMBING, GENERAL
    │       Payment models: DAILY_WAGE or CONTRACT_FIXED
    │
    ├── Add Workers to Team
    │       API: POST /api/v1/labor/teams/{team_id}/workers
    │       Data: name, skill_level (HELPER/SKILLED/FOREMAN), daily_rate (override)
    │
    ├── Supervisor Logs Daily Attendance
    │       API: POST /api/v1/labor/attendance
    │       Data: project_id, sprint_id, team_id, date,
    │             workers_present, total_hours, site_photo_url
    │       → Auto-calculation:
    │         cost = workers_present × daily_rate × (total_hours / 8)
    │       → Status: PENDING
    │       → Site photo is MANDATORY (prevents ghost labor)
    │
    ├── Manager Reviews Weekly (Saturday payroll)
    │       Page: /dashboard/admin/payroll
    │       → Group pending AttendanceLogs by team
    │       → Review: "Villa 402: 6 days × ₹6,400 = ₹38,400"
    │       → Click "Approve & Generate Payout"
    │       │
    │       ├── SPENDING LOCK CHECK:
    │       │     effective_balance = total_received - (total_spent + pending)
    │       │     IF effective_balance < payout_amount:
    │       │       → REJECTED: "Insufficient Project Funds"
    │       │       → Manager must request client top-up
    │       │
    │       └── IF approved:
    │             → AttendanceLog status: APPROVED → PAID
    │             → Transaction created (OUTFLOW, source=LABOR)
    │             → Project Wallet: total_spent += payout
    │             → Payroll CSV exported for bank transfer
    │
    └── Contract Labor (Alternative Flow)
            For teams paid per sqft (not daily):
            → Attendance logged for records only, not billing
            → Billing based on work milestones (e.g., "50% framing done")
            → Supervisor raises bill → Manager approves → Wallet debited
```

#### 4D. Variation Orders (VOs)

```
Client requests changes after contract is signed
    │
    ├── Create Variation Order
    │       API: POST /api/v1/projects/{id}/variation-orders
    │       Data: description, additional_cost, linked_sprint_id
    │       → Status: REQUESTED
    │       → Notification to Manager (APPROVAL_REQ)
    │
    ├── Manager Approves
    │       API: PATCH /api/v1/projects/{id}/variation-orders/{vo_id}
    │       → Status: APPROVED
    │       → Manager maps VO to a sprint
    │       → System prompts: "Extend Sprint 4 by X days?"
    │       → Gantt chart expands, handover date pushed
    │
    ├── Client Pays for VO
    │       → Status: PAID
    │       → Wallet updates:
    │           total_agreed_value += vo.additional_cost
    │           total_received += vo.additional_cost
    │
    └── ⚠️ STRICT RULE: VO work CANNOT start until payment received
```

---

### PHASE 5: Financial Tracking (Throughout Execution)

```
┌──────────────────────────────────────────────────────────────┐
│                     PROJECT WALLET                            │
│                                                              │
│  total_agreed_value  = Original Quote + Approved VOs         │
│  total_received      = All cleared INFLOW transactions       │
│  total_spent         = All cleared OUTFLOW transactions      │
│  pending_approvals   = Uncleared/pending expenses            │
│                                                              │
│  current_balance     = total_received - total_spent          │
│  effective_balance   = received - (spent + pending)          │
│                        ↑ Used for Spending Lock              │
└──────────────────────────────────────────────────────────────┘

MONEY IN (INFLOW):
    ├── Client Bank Transfer / Cheque
    │     → Sales/Manager uploads proof screenshot
    │     → Transaction created: INFLOW, PENDING
    │     → Manager clicks "Verify"
    │     → Status: CLEARED → total_received increases
    │     API: POST /api/v1/finance/transactions
    │     API: PATCH /api/v1/finance/transactions/{id}/verify
    │
    └── (Future) Payment Gateway (Razorpay/Stripe)
          → Client pays via portal
          → Webhook → auto Transaction (INFLOW, CLEARED)

MONEY OUT (OUTFLOW):
    ├── Vendor PO Delivered → OUTFLOW (source: VENDOR)
    ├── Labor Attendance Approved → OUTFLOW (source: LABOR)
    ├── Petty Cash → Supervisor uploads bill → OUTFLOW (source: PETTY_CASH)
    │
    └── ALL outflows must pass SPENDING LOCK:
          IF effective_balance < amount:
            → HTTP 402: "Insufficient Project Funds"
            → Request client top-up

FINANCIAL ALERTS:
    ├── Spend > estimated cost margin → project flagged LOSS-MAKING (Red UI)
    ├── Burn rate steep vs progress → Manager alerted
    └── Vendor bill variance > 10% → Price alert to Manager

REPORTS:
    ├── GET /api/v1/finance/projects/{id}/financial-health
    │     → { total_received, total_spent, balance, can_spend_more }
    ├── GET /api/v1/finance/export/transactions → CSV
    └── GET /api/v1/finance/export/cash-flow → Monthly cash flow
```

**Pages used:**
- `/dashboard/admin/finance` — Project-level financial tracking
- `/dashboard/expenses` — Record project expenses
- `/dashboard/client-billing` — Generate and send invoices
- `/dashboard/reports` — P&L, analytics, financial dashboards

---

### PHASE 6: Handover (Sprint 6)

```
Sprint 6: Handover & Snag List (5 days)
    │
    ├── Deep cleaning completed
    │
    ├── Quality Inspection
    │       API: POST /api/v1/quality/inspections
    │       → Checklist-based inspection
    │       → Snag items logged with photos
    │
    ├── Snag Resolution
    │       → Each snag tracked to completion
    │       → Supervisor marks resolved
    │       → Manager verifies
    │
    ├── Final Inspection Passed
    │       → All snags resolved
    │       → Sprint 6 status: COMPLETED
    │
    ├── Key Handover to Client
    │       → Project status: COMPLETED
    │       → Final invoice generated
    │
    └── Notifications
            → Client: "Your project is complete!" (email + in-app)
            → Manager: Project completion summary
            → Financial summary locked
```

---

## 4. Data Flow Per User Role (Summary)

### BDE (Business Development Executive)
```
Login → Dashboard (lead stats)
  → Create Lead (name, contact, source, property details)
  → Log Activities (calls, meetings, site visits)
  → Hand off qualified leads to Sales
```

### Sales
```
Login → View Assigned Leads → Qualify Lead
  → Create Quotation (add rooms → add items → set markup)
  → Finalize Quote → Send PDF to Client
  → Client approves/rejects → Negotiate (new versions)
  → Convert lead to client
  → Hand off to Manager for project conversion
```

### Manager
```
Login → Dashboard (pending approvals, financial health)
  → Convert approved quote → Project (auto-generates sprints + wallet)
  → APPROVE/REJECT: material requests, POs, attendance, VOs, expenses
  → Monitor financial health (wallet balance, burn rate, profitability)
  → Adjust sprint timelines (ripple effect on dependents)
  → Verify client payments (PENDING → CLEARED)
  → Generate reports (P&L, cash flow, payroll export)
```

### Supervisor
```
Login → View Assigned Projects → Track Sprint Progress
  → Log Daily Work (notes + photos + blockers)
  → Log Labor Attendance (team + headcount + hours + mandatory site photo)
  → Raise Material Requests (indent for approval)
  → Upload Petty Cash Bills (tea, transport, diesel)
  → Update Execution Status
  → Report Quality Issues / Snags
```

### Client
```
Login at client portal (tenant subdomain)
  → View Project Summary (status, completion %, milestones)
  → Track Sprint Progress (visual timeline)
  → View Daily Logs (only those marked visible_to_client)
  → View Payment History & Invoices
  → Pay Milestones (manual upload or future gateway)
  → Download Documents (quotes, invoices)
```

### Super Admin / Platform Admin
```
Login at main domain (no tenant slug, platform admin only)
  → Platform Dashboard (all orgs, MRR, active users)
  → Create/Manage Organizations (CRUD, plan changes)
  → Invite Users to any org
  → Suspend/Activate/Delete Organizations
  → View Revenue Analytics (MRR, ARR, churn)
  → Also has full Manager access within any org
```

---

## 5. Notification Matrix

| Event | Recipients | Channel |
|-------|-----------|---------|
| New lead created | Assigned BDE/Sales | In-app + WhatsApp |
| Lead status changed | Manager | In-app |
| Lead converted to client | Sales + Manager | In-app |
| Quotation finalized & sent | Client | Email (PDF attached) + WhatsApp |
| Quotation approved/rejected | Sales + Manager | In-app |
| Project created (conversion) | Manager + Supervisor + Client | In-app + Email |
| Material request raised | Manager | In-app (approval required) |
| Purchase order needs approval | Manager | In-app |
| Transaction pending verification | Manager | In-app |
| Payment received & cleared | Client + Finance team | Email |
| Variation order requested | Manager | In-app (approval required) |
| VO approved/paid | Manager + Client | In-app |
| Sprint delayed | Manager + Client | In-app |
| Budget warning (overspend risk) | Manager | In-app (alert) |
| Vendor bill price variance >10% | Manager | In-app (alert) |
| Project completed (handover) | Client + Manager | Email + In-app |

---

## 6. API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/token` | Login (OAuth2 password flow) |
| POST | `/auth/select-org` | Select org after multi-org login |
| POST | `/auth/switch-org` | Switch active organization |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/register` | Self-registration |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset with token |
| POST | `/auth/accept-invite` | Accept org invitation |

### CRM (Leads & Clients)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/crm/leads` | Create lead |
| GET | `/crm/leads` | List leads (with filters) |
| PUT | `/crm/leads/{id}` | Update lead |
| POST | `/crm/leads/{id}/convert` | Convert lead to client |
| POST | `/crm/leads/{id}/activities` | Log activity |

### Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quotes` | Create quotation (DRAFT) |
| GET | `/quotes` | List quotations |
| GET | `/quotes/{id}` | Get quote with rooms/items |
| POST | `/quotes/{id}/finalize` | Freeze to SENT |
| PATCH | `/quotes/{id}/status` | Approve/Reject |
| POST | `/quotes/{id}/send` | Email PDF to client |
| GET | `/quotes/{id}/pdf` | Download PDF |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/convert/{quote_id}` | Convert quote to project |
| GET | `/projects` | List projects |
| PATCH | `/projects/{id}` | Update project |
| PATCH | `/projects/{id}/sprints/{sprint_id}` | Update sprint (triggers ripple) |
| POST | `/projects/{id}/daily-logs` | Log daily progress |
| POST | `/projects/{id}/variation-orders` | Create VO |
| PATCH | `/projects/{id}/variation-orders/{vo_id}` | Update VO status |

### Finance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/finance/transactions` | Record transaction |
| PATCH | `/finance/transactions/{id}/verify` | Manager verification |
| GET | `/finance/projects/{id}/wallet` | Current wallet state |
| GET | `/finance/projects/{id}/financial-health` | Full health summary |
| GET | `/finance/transactions` | List with filters |
| GET | `/finance/export/transactions` | Export CSV |
| GET | `/finance/export/cash-flow` | Monthly cash flow |
| GET | `/finance/export/payroll` | Payroll CSV |

### Labor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/labor/teams` | Create labor team |
| GET | `/labor/teams` | List teams |
| POST | `/labor/teams/{id}/workers` | Add worker |
| POST | `/labor/attendance` | Log attendance |
| GET | `/labor/attendance` | List attendance logs |
| PATCH | `/labor/attendance/{id}` | Approve attendance |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/inventory/items` | Create item |
| GET | `/inventory/items` | List items |
| POST | `/inventory/vendors` | Create vendor |
| GET | `/inventory/vendors` | List vendors |
| POST | `/inventory/purchase-orders` | Create PO |
| GET | `/inventory/purchase-orders` | List POs |
| PATCH | `/inventory/purchase-orders/{id}` | Update PO status |

### Platform (Super Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/platform/organizations` | Create org |
| GET | `/platform/organizations` | List all orgs |
| PATCH | `/platform/organizations/{id}` | Update org |
| DELETE | `/platform/organizations/{id}` | Soft-delete org |
| POST | `/platform/organizations/{id}/members` | Add member |
| POST | `/platform/organizations/{id}/invite` | Invite via email |
| PATCH | `/platform/organizations/{id}/plan` | Change plan tier |
| GET | `/platform/stats` | Platform-wide stats |

---

## 7. Critical Business Rules

1. **Spending Lock**: No outflow transaction if `effective_balance < amount`. Manager must request client top-up first.

2. **Ripple Date Engine**: Changing any sprint's end date automatically cascades delays to all dependent sprints downstream.

3. **VO Payment Gate**: Variation Order work **cannot begin** until client payment is received and status is PAID.

4. **Quotation Versioning**: Multiple versions per lead (v1, v2, v3...). Only one version can be APPROVED. Approved quote gets ARCHIVED on project conversion.

5. **Stock Dual Flow**:
   - General Stock → updates `Item.current_stock` on receipt
   - Project-Specific → does NOT touch `current_stock`, cost booked directly to project wallet

6. **Plan Limits**: Lead and project creation enforced per org subscription tier. Exceeding limits returns HTTP 403.

7. **Attendance Cost Formula**: `cost = workers_present × daily_rate × (total_hours / 8)`

8. **Price Variance Alert**: If vendor bill differs from PO by more than 10%, system triggers a price alert to Manager and updates the item's base price.

9. **Ghost Labor Prevention**: Site photo is mandatory for attendance logging. No photo = no log submission.

10. **Multi-Tenancy Isolation**: All data queries are scoped to `org_id`. Cross-tenant data access is impossible at the ORM level.

---

## 8. Frontend Page Map

| Page | Roles | Purpose |
|------|-------|---------|
| `/dashboard` | ALL_INTERNAL | Stats, approvals, quick actions |
| `/dashboard/sales/leads` | SALES_ROLES | Lead pipeline (Kanban + table) |
| `/dashboard/sales/quotes` | SALES_ROLES | Quotation management |
| `/dashboard/projects` | OPS_ROLES | Project list + detail |
| `/dashboard/admin/inventory` | ADMIN_ROLES | Stock management |
| `/dashboard/admin/vendors` | ADMIN_ROLES | Vendor CRUD |
| `/dashboard/admin/labor` | OPS_ROLES | Labor teams & workers |
| `/dashboard/admin/approvals` | ADMIN_ROLES | Multi-entity approval queue |
| `/dashboard/admin/finance` | ADMIN_ROLES | Project financials |
| `/dashboard/admin/payroll` | ADMIN_ROLES | Weekly labor payouts |
| `/dashboard/admin/purchase-orders` | ADMIN_ROLES | PO management |
| `/dashboard/admin/invoices` | ADMIN_ROLES | Client invoicing |
| `/dashboard/execution-tracking` | OPS_ROLES | Daily logs, sprint progress |
| `/dashboard/expenses` | ADMIN_ROLES | Expense recording |
| `/dashboard/reports` | ADMIN_ROLES | Analytics & P&L |
| `/dashboard/client-portal` | CLIENT | Project view + payments |
| `/dashboard/platform` | SUPER_ADMIN | Multi-org management |
| `/dashboard/platform/organizations` | SUPER_ADMIN | Org CRUD |
| `/dashboard/platform/revenue` | SUPER_ADMIN | MRR/ARR analytics |
