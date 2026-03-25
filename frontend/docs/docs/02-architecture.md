# Architecture

## Table of Contents

1. [Multi-Tenant Architecture](#multi-tenant-architecture)
2. [Tenant Isolation Mechanism](#tenant-isolation-mechanism)
3. [Authentication Flow](#authentication-flow)
4. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
5. [API Versioning](#api-versioning)
6. [Database Schema Overview](#database-schema-overview)
7. [File Upload System](#file-upload-system)
8. [Notification System](#notification-system)
9. [Financial System](#financial-system)
10. [PDF Generation](#pdf-generation)
11. [Floor Plan AI Microservice](#floor-plan-ai-microservice)

---

## Multi-Tenant Architecture

Igolo Interior ERP uses a **schema-per-tenant** multi-tenancy strategy in PostgreSQL. Each organization (tenant) gets its own isolated PostgreSQL schema containing all business data, while shared platform data lives in the `public` schema.

### Data Plane Separation

```
PostgreSQL Database: int_design_erp
|
|-- public (Control Plane)
|   |-- users
|   |-- organizations
|   |-- org_memberships
|   |-- org_invitations
|   +-- password_reset_tokens
|
|-- tenant_acme (Tenant: Acme Interiors)
|   |-- projects
|   |-- leads
|   |-- quotations
|   |-- inventory_items
|   |-- expenses
|   |-- ... (all business tables)
|
|-- tenant_designco (Tenant: DesignCo)
|   |-- projects
|   |-- leads
|   |-- quotations
|   +-- ... (same table set, isolated data)
```

### Control Plane vs Data Plane

| Plane | Schema | Tables | Purpose |
|---|---|---|---|
| **Control Plane** | `public` | `users`, `organizations`, `org_memberships`, `org_invitations` | Identity, authentication, platform management |
| **Data Plane** | `tenant_{slug}` | `projects`, `leads`, `quotations`, `inventory_items`, `expenses`, `labor_entries`, `notifications`, and 30+ others | All tenant business data |

### Schema Naming Convention

Organization slugs are converted to safe PostgreSQL schema names:

```
Organization slug: "acme-interiors"
Schema name:       "tenant_acme_interiors"
```

The `slugify_schema_name()` function strips non-alphanumeric characters and prepends `tenant_`.

### Tenant Provisioning

When a new organization is created, the system:

1. Creates a new PostgreSQL schema (`CREATE SCHEMA IF NOT EXISTS "tenant_{slug}"`)
2. Sets the `search_path` to the new schema
3. Creates all Data Plane tables inside that schema using SQLAlchemy metadata
4. Resets `search_path` to `public`

The provisioned tenant tables are defined in the `TENANT_TABLES` set within the tenant provisioner service, which includes approximately 30 tables covering projects, CRM, quotations, inventory, finance, labor, quality, documents, and notifications.

### Subscription Tiers

Each organization has a subscription model:

| Tier | Max Users | Max Projects | Status Options |
|---|---|---|---|
| **FREE** | 3 | 2 | TRIAL, ACTIVE |
| **STARTER** | Configurable | Configurable | ACTIVE, PAST_DUE |
| **PRO** | Configurable | Configurable | ACTIVE, PAST_DUE |
| **ENTERPRISE** | Configurable | Configurable | ACTIVE, PAST_DUE |

Subscription statuses: `TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `SUSPENDED`

---

## Tenant Isolation Mechanism

Three layers enforce tenant isolation at runtime:

### Layer 1: TenantMiddleware

The `TenantMiddleware` (Starlette BaseHTTPMiddleware) intercepts every HTTP request before it reaches any route handler. It resolves the tenant schema by:

1. **X-Tenant-ID Header** -- If present, looks up the organization by slug to find its `schema_name`
2. **JWT `org_id` Claim** -- Extracts `org_id` from the decoded JWT token and looks up the organization's `schema_name`

The resolved schema is stored on `request.state.tenant_schema` for downstream use.

Certain paths bypass tenant resolution entirely:

- `/auth/*` -- Authentication endpoints
- `/platform/*` -- Platform admin endpoints
- `/billing/*` -- Subscription billing
- `/health`, `/docs`, `/redoc`, `/openapi` -- Infrastructure and documentation
- `/uploads/*` -- Static file serving

An in-memory cache (`_SCHEMA_CACHE`) maps `org_id -> schema_name` and `slug -> schema_name` to avoid repeated database lookups. The cache is invalidated when organizations are updated or deleted.

### Layer 2: Tenant-Scoped Database Sessions

The `get_tenant_session` dependency provides a SQLAlchemy `AsyncSession` with the PostgreSQL `search_path` set to the tenant's schema:

```
SET search_path TO "tenant_acme", public
```

All queries within this session automatically operate on the tenant's tables. When the session closes, the search_path is reset:

```
SET search_path TO public
```

### Layer 3: JWT org_id Enforcement

The `AuthContext` dataclass carries `org_id` from the JWT token through every authenticated request. Service functions receive `org_id` as a parameter and include it in query filters, providing an additional row-level guard even if the schema isolation were somehow bypassed.

### Request Lifecycle (Tenant-Scoped)

```
HTTP Request
    |
    v
TenantMiddleware
    |-- Extract JWT or X-Tenant-ID header
    |-- Resolve org_id -> schema_name (cached)
    |-- Store on request.state.tenant_schema
    |
    v
TrialEnforcementMiddleware
    |-- Check subscription status (TRIAL, ACTIVE, PAST_DUE, SUSPENDED)
    |-- Block expired trials (402)
    |-- Block suspended accounts (403)
    |-- Read-only mode for PAST_DUE (block writes)
    |
    v
Route Handler
    |-- get_auth_context() -> AuthContext(user, org_id, role, schema_name)
    |-- get_tenant_session() -> SET search_path TO tenant schema
    |
    v
Service Layer
    |-- Business logic with org_id scoping
    |
    v
Response
```

---

## Authentication Flow

### Token Types

| Token | Algorithm | Lifetime | Purpose |
|---|---|---|---|
| **Access Token** | HS256 | 30 minutes | API request authorization |
| **Refresh Token** | HS256 | 7 days | Obtain new access tokens |

### JWT Payload Structure

```json
{
  "sub": "<user-uuid>",
  "org_id": "<organization-uuid>",
  "type": "access",
  "exp": 1711900000
}
```

The `org_id` claim binds the token to a specific organization context. Users who belong to multiple organizations must obtain separate tokens for each.

### Login Flow

```
1. POST /api/v1/auth/token
   Body: { email, password, org_slug? }
       |
2. Verify credentials (bcrypt hash comparison)
       |
3. Resolve organization context:
   - If org_slug provided: validate membership
   - If user has a default org: use that
   - If user belongs to one org: use that
       |
4. Generate access_token + refresh_token
   (both include sub, org_id claims)
       |
5. Return tokens to client
```

### Token Refresh

```
POST /api/v1/auth/refresh
Body: { refresh_token }
    |
1. Decode refresh token (verify type == "refresh")
2. Look up user, verify active
3. Issue new access_token + refresh_token
```

### Password Management

- Passwords are hashed using **bcrypt** via `passlib`
- Password reset uses time-limited tokens stored in the `password_reset_tokens` table
- Reset tokens expire after a configurable period and are marked as `used` after consumption

### Client-Side Token Handling

The frontend stores tokens in a Zustand auth store. An Axios interceptor attaches the `Authorization: Bearer <token>` header to every API request. On receiving a 401 response, the interceptor triggers logout and redirects to the login page.

---

## Role-Based Access Control (RBAC)

### Roles

The system defines seven roles through the `UserRole` enum:

| Role | Description | Typical Access |
|---|---|---|
| **SUPER_ADMIN** | Organization owner/admin | Full access: user management, all financials, system config |
| **MANAGER** | Project oversight | Project management, approvals, financial overrides, team assignment |
| **BDE** | Business Development Executive | Lead generation, initial contact logging |
| **SALES** | Sales team member | Lead qualification, quotation creation, client communication |
| **SUPERVISOR** | On-site execution lead | Labor attendance, material requests (indent), daily logs, site photos |
| **CLIENT** | End client | View-only project status, sprint progress, payment portal |
| **LABOR_LEAD** | Labor team leader | Task status updates, view daily tasks |

### Role Enforcement

Roles are enforced at two levels:

**Backend -- `role_required` Dependency:**

Each API endpoint declares its allowed roles. The `role_required()` function returns a FastAPI dependency that:

1. Decodes the JWT token
2. Resolves the `AuthContext` (user, org_id, role, schema_name)
3. Checks `ctx.role.value` against the allowed roles list
4. Returns 403 Forbidden if the role is not permitted
5. Platform admins (`is_platform_admin = True`) bypass all role checks

**Frontend -- RoleGuard Component:**

A wrapper component checks the user's role from the auth store and renders `<AccessDeniedScreen />` or redirects if the user's role is not in the `allowedRoles` array.

### Organization Membership

Roles are scoped to organizations via the `org_memberships` table:

| Column | Description |
|---|---|
| `user_id` | Reference to the user |
| `org_id` | Reference to the organization |
| `role` | The user's role within this organization |
| `is_default` | Whether this is the user's default org (for auto-selection at login) |
| `is_active` | Whether this membership is active |

A unique constraint on `(user_id, org_id)` prevents duplicate memberships. A user can belong to multiple organizations with different roles in each.

### Platform Admin

The `User.is_platform_admin` flag grants cross-organization super access. Platform admins:

- Bypass all role checks
- Bypass subscription/trial enforcement
- Can access `/platform/*` endpoints for managing all organizations

---

## API Versioning

All API endpoints are namespaced under `/api/v1/`:

```
http://localhost:8000/api/v1/<module>/<endpoint>
```

### Route Modules

| Prefix | Tag | Description |
|---|---|---|
| `/api/v1/auth` | Auth | Login, register, token refresh, password reset |
| `/api/v1/crm` | Sales Pipeline | Leads, clients, lead activities |
| `/api/v1/quotes` | Sales Pipeline | Quotations (CRUD, PDF, versioning) |
| `/api/v1/inventory` | Inventory | Items, purchase orders, stock movements |
| `/api/v1/projects` | Project Execution | Projects, sprints, daily logs, variation orders |
| `/api/v1/finance` | Finance | Transactions, wallets, financial health |
| `/api/v1/labor` | Labor | Attendance, contractors, payroll |
| `/api/v1/invoices` | Invoices | Invoice generation and management |
| `/api/v1/approvals` | Approvals | Approval workflows |
| `/api/v1/work-orders` | Work Orders | Work order CRUD and PDF |
| `/api/v1/material-requests` | Material Requests | Supervisor indent requests |
| `/api/v1/quality` | Quality Management | Checklists and inspections |
| `/api/v1/notifications` | Notifications | In-app notification CRUD |
| `/api/v1/upload` | Upload | File upload endpoint |
| `/api/v1/users` | Users | User profile and management |
| `/api/v1/org` | Organization | Org settings, invitations, members |
| `/api/v1/platform` | Platform Admin | Cross-org platform management |
| `/api/v1/billing` | Billing | Subscription management |
| `/api/v1/payments` | Payments | Payment processing (Razorpay) |
| `/api/v1/assets` | Assets | Asset tracking |
| `/api/v1/vendor-bills` | Vendor Bills | Vendor bill reconciliation |

### API Documentation

FastAPI auto-generates OpenAPI documentation:

- **Swagger UI:** `/docs`
- **ReDoc:** `/redoc`
- **OpenAPI JSON:** `/api/v1/openapi.json`

### Service Pattern

All routes follow a strict service pattern -- route handlers contain no business logic and delegate entirely to service functions:

```
Route Handler (Controller)
    |-- Validates request via Pydantic schema
    |-- Calls service function
    +-- Returns Pydantic response schema

Service Function (Business Logic)
    |-- Implements business rules
    |-- Interacts with database via SQLAlchemy
    +-- Raises custom exceptions on failure
```

---

## Database Schema Overview

### Base Mixins

All models inherit from common mixins defined in `app/db/base.py`:

| Mixin | Columns | Purpose |
|---|---|---|
| `UUIDMixin` | `id` (UUID v4, primary key) | Unique identifier for all entities |
| `TimestampMixin` | `created_at`, `updated_at` (UTC timestamps) | Audit trail |
| `TenantMixin` | `org_id` (FK to organizations) | Row-level tenant scoping |

### Core Models and Relationships

```
Organization (public)
    |-- 1:N --> OrgMembership (public)
    |               |-- N:1 --> User (public)
    |
    +-- 1:N --> OrgInvitation (public)

User (public)
    |-- 1:N --> Lead (tenant)
    |-- 1:1 --> Client (tenant)
    +-- 1:N --> Notification (tenant)

Lead (tenant)
    |-- N:1 --> User (assigned_to)
    +-- 1:N --> Quotation (tenant)

Quotation (tenant)
    |-- N:1 --> Lead
    |-- 1:N --> QuoteRoom
    |               +-- 1:N --> QuoteItem
    +-- 1:1 --> Project (accepted_quotation)

Client (tenant)
    |-- N:1 --> User
    +-- 1:N --> Project

Project (tenant)
    |-- N:1 --> Client
    |-- N:1 --> Quotation (accepted)
    |-- N:1 --> User (manager)
    |-- N:1 --> User (supervisor)
    |-- 1:N --> Sprint
    |-- 1:N --> VariationOrder
    |-- 1:N --> DailyLog
    +-- 1:1 --> ProjectWallet

Sprint (tenant)
    |-- N:1 --> Project
    +-- N:1 --> Sprint (dependency, self-referential)

ProjectWallet (tenant)
    +-- N:1 --> Project

Transaction (tenant)
    |-- N:1 --> Project
    +-- Optional FKs --> PurchaseOrder, LaborLog, VariationOrder
```

### Key Model Details

**Lead Statuses:** `NEW` -> `CONTACTED` -> `QUALIFIED` -> `QUOTATION_SENT` -> `NEGOTIATION` -> `CONVERTED` / `LOST`

**Quotation Structure:**
- A Quotation contains multiple QuoteRooms (e.g., Kitchen, Master Bedroom)
- Each QuoteRoom contains multiple QuoteItems with quantity, unit price, markup percentage, and calculated final price
- Quotations are versioned (v1, v2, v3...) and have statuses: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `ARCHIVED`

**Project Sprints (Standard 6-Phase Workflow):**

| Order | Phase | Default Duration |
|---|---|---|
| 1 | Design & Approvals | 10 days |
| 2 | Civil & Demolition | 15 days |
| 3 | MEP (Mech, Elec, Plumb) | 10 days |
| 4 | Woodwork & Carpentry | 25 days |
| 5 | Finishing & Painting | 12 days |
| 6 | Handover & Snag List | 5 days |

Sprints are auto-generated when a project is created. Each sprint has a dependency on the previous sprint, enabling a "ripple date update" algorithm -- when one sprint's dates change, all subsequent sprints shift accordingly.

---

## File Upload System

### Architecture

The upload system uses a dual-mode strategy based on the `ENVIRONMENT` setting:

| Environment | Storage Backend | URL Format |
|---|---|---|
| `local` | Local filesystem (`uploads/` directory) | `/uploads/{org_id}/{category}/{uuid}.{ext}` |
| Production | AWS S3 | `https://{bucket}.s3.{region}.amazonaws.com/{org_id}/{category}/{uuid}.{ext}` |

### Multi-Tenant File Isolation

Files are stored under org-scoped paths. When `org_id` is provided to the upload service, the path becomes `{org_id}/{category}/{filename}`, ensuring each tenant's files are isolated.

### Upload Categories

| Category | Accepted Types | Max Size | Description |
|---|---|---|---|
| `items` | Images (JPEG, PNG, WebP, GIF) | 10 MB | Inventory item photos |
| `leads` | Images + PDF | 25 MB | Lead attachments |
| `projects` | Images | 10 MB | Project cover images |
| `attendance` | Images | 10 MB | Labor attendance site photos |
| `finance` | Images + PDF | 25 MB | Payment proofs, receipts |
| `avatars` | Images | 10 MB | User profile pictures |
| `quotes` | Images | 10 MB | Quotation attachments |
| `purchase-orders` | Images + PDF | 25 MB | PO documents |
| `daily-logs` | Images | 10 MB | Site progress photos |
| `variation-orders` | Images + PDF | 25 MB | VO supporting documents |

### Upload Flow

1. Client sends `POST /api/v1/upload/{category}` with multipart form data
2. Server validates the category, MIME type, and file size
3. A UUID-based filename is generated to prevent collisions
4. File is written to local disk or uploaded to S3
5. The resulting URL is returned to the client for storage in the relevant model

### Local Development

In local development, the FastAPI application mounts the `uploads/` directory as a static file server:

```
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

This allows uploaded files to be served directly at `http://localhost:8000/uploads/...`.

---

## Notification System

### Channels

The system supports three notification channels:

| Channel | Implementation | When Used |
|---|---|---|
| **In-App** | `notifications` table (per-tenant) | Always -- all events create in-app notifications |
| **Email** | SMTP via `FastAPI-Mail` with Jinja2 templates | Configurable per notification type |
| **WhatsApp** | Meta Business Cloud API (template messages) | Optional -- lead assignment, quote sent, payment received, sprint updates, handover |

### In-App Notifications

Notifications are stored in the tenant schema and scoped to individual users:

| Field | Type | Description |
|---|---|---|
| `recipient_id` | UUID | Target user |
| `type` | Enum | `ALERT`, `APPROVAL_REQ`, `INFO`, `PAYMENT_RECEIVED` |
| `title` | String(255) | Notification headline |
| `body` | Text | Detailed message |
| `action_url` | String | Frontend route for click-through navigation |
| `is_read` | Boolean | Read/unread status |

The frontend polls the unread count endpoint periodically and displays a badge on the bell icon in the navigation bar.

### Role-Based Notifications

The `notify_role()` function sends notifications to all active members with a specific role within an organization. For example, when a transaction needs verification, all users with the `MANAGER` role receive both an in-app notification and an email.

### Email Templates

Emails use Jinja2 HTML templates stored in `backend/app/templates/`. The email system uses a fire-and-forget pattern -- emails are sent asynchronously in background threads so they never block the API response.

Key email triggers:

- New lead assigned to a sales person
- Quotation sent to client (with PDF attachment)
- Approval request to manager
- Payment confirmation to client
- Transaction pending verification

### WhatsApp Notifications

WhatsApp messages use pre-approved Meta Business API templates. Available notification types:

| Function | Template | Parameters |
|---|---|---|
| `notify_lead_assigned` | `lead_assigned` | Lead name, assigned user |
| `notify_quote_sent` | `quote_sent` | Client name, amount, link |
| `notify_payment_received` | `payment_received` | Client name, amount, project |
| `notify_sprint_update` | `sprint_update` | Client name, sprint, status |
| `notify_project_handover` | `project_handover` | Client name, project |

WhatsApp is opt-in via the `WHATSAPP_ENABLED` environment variable. Phone numbers are automatically normalized to international format (Indian 91-prefix default).

---

## Financial System

### The Project Wallet

Every project has an associated `ProjectWallet` that acts as a self-contained financial entity:

```
ProjectWallet
|-- total_agreed_value    # Original quote + approved Variation Orders
|-- total_received        # Sum of verified client payments (inflows)
|-- total_spent           # Sum of verified expenses (outflows)
|-- pending_approvals     # Outflows awaiting verification
|-- current_balance       # total_received - total_spent
```

### The Spending Lock

The most critical business rule in the system. Before any expense (material purchase, labor payment, petty cash) is recorded:

```
effective_balance = total_received - (total_spent + pending_approvals)

if effective_balance < amount_needed:
    raise InsufficientFundsException (HTTP 402)
```

This prevents projects from overspending and ensures expenses cannot exceed received funds. The lock uses "conservative logic" that reserves funds for pending (unverified) outflows.

### Transaction Lifecycle

```
Transaction Created (PENDING)
    |
    |-- OUTFLOW: amount added to wallet.pending_approvals
    |-- INFLOW: no wallet change yet (awaits verification)
    |
    v
Manager Verifies Transaction (CLEARED)
    |
    |-- OUTFLOW: pending_approvals -= amount, total_spent += amount
    |-- INFLOW: total_received += amount
    |
    v
Wallet balance updated, notifications sent
```

Transactions can also be set to `REJECTED` status.

### Transaction Classification

| Category | Sources | Description |
|---|---|---|
| **INFLOW** | `CLIENT` | Client payments (bank transfer, cheque, Razorpay) |
| **OUTFLOW** | `VENDOR`, `LABOR`, `PETTY_CASH` | Material purchases, labor payroll, site expenses |

### Financial Health Endpoint

The `/finance/{project_id}/health` endpoint returns a complete financial snapshot:

```json
{
  "project_id": "uuid",
  "total_agreed_value": 1000000.00,
  "total_received": 500000.00,
  "total_spent": 350000.00,
  "pending_approvals": 50000.00,
  "current_balance": 150000.00,
  "effective_balance": 100000.00,
  "can_spend_more": true,
  "estimated_margin_percent": 65.0
}
```

The `estimated_margin_percent` is calculated as `((agreed_value - spent) / agreed_value) * 100`. When this drops below the expected margin threshold and the project is not yet complete, the system signals a potential loss.

### Analytics Endpoints

The finance service provides several aggregation endpoints:

- **Transaction Summary** -- Total inflow, outflow, pending amounts with optional date range and project filters
- **Time-Series Aggregation** -- Inflow/outflow bucketed by day, week, or month
- **Source Breakdown** -- Totals grouped by transaction source (CLIENT, VENDOR, LABOR, PETTY_CASH)
- **Project Breakdown** -- Inflow/outflow totals grouped by project

### Variation Orders (Financial Impact)

When a client requests additional work after the contract is signed:

1. Variation Order created with `REQUESTED` status
2. Client approves and pays the additional cost
3. VO status changes to `PAID`
4. `wallet.total_agreed_value += vo.additional_cost`
5. Payment recorded as INFLOW transaction
6. Manager can now spend the additional funds on materials/labor

Rule: VO work cannot begin until VO payment is received and verified.

---

## PDF Generation

### Architecture

The PDF pipeline converts HTML/CSS templates to PDF using WeasyPrint:

```
Data (SQLAlchemy) --> Jinja2 Template --> HTML String --> WeasyPrint --> PDF Bytes
```

### Template Location

All templates are stored in `backend/app/templates/`.

### Document Types

| Document | Template | Trigger |
|---|---|---|
| **Client Quotation** | `quote_v1.html` | User clicks "Download Quote PDF" |
| **Purchase Order** | `po_pdf.html` | PO generation for vendor |
| **Tax Invoice** | `invoice_pdf.html` | Invoice creation |
| **Work Order** | `work_order_pdf.html` | Work order generation |

### Generation Flow

1. Service function fetches the entity with all related data (rooms, items, client info) using SQLAlchemy eager loading (`selectinload`)
2. A template context dictionary is built with the data and helper functions (e.g., `format_inr` for Indian number formatting)
3. Jinja2 renders the HTML template with the context
4. WeasyPrint converts the HTML string to PDF bytes
5. PDF is returned as a `StreamingResponse` for download or uploaded to S3 for archival

### Currency Formatting

The `_format_inr()` helper formats numbers in Indian numbering convention (e.g., `1,23,456.78`) with two decimal places, used throughout quotation and invoice PDFs.

---

## Floor Plan AI Microservice

### Overview

The Floor Plan AI microservice is a standalone FastAPI application that analyzes uploaded floor plan images using AI vision models. It extracts structured room information, dimensions, and interior design recommendations.

### Provider Support

| Provider | Model | Use Case |
|---|---|---|
| **Google Gemini** | `gemini-2.0-flash` (default) | Cloud-based, fast, recommended for production |
| **Ollama** | `llava:13b` (default) | Self-hosted, slower (especially on CPU), good for privacy |

The provider is selected via the `AI_PROVIDER` environment variable.

### Analysis Flow

```
Floor Plan Image URL
    |
    v
Fetch image bytes (from backend uploads or external URL)
    |
    v
Build structured prompt with room catalog and schema
    |
    v
Call AI provider (Gemini or Ollama)
    |
    v
Parse JSON from response (with retry on failure)
    |
    v
Validate against Pydantic schema (FloorPlanAnalysis)
    |
    v
Post-process (filter items, calculate areas)
    |
    v
Return structured analysis
```

### Room Catalog

The microservice maintains a catalog of 14 room types, each with a list of valid interior items:

| Room Key | Interior Items |
|---|---|
| `LIVING_ROOM` | TV unit, sofa back panel, storage display, shoe rack, false ceiling, accent wall, cove lighting |
| `KITCHEN` | Base cabinet, wall cabinet, tall unit, countertop, backsplash, breakfast counter, loft storage |
| `MASTER_BEDROOM` | Wardrobe, bed back panel, dresser, side tables, study table, false ceiling, TV unit, curtain pelmet |
| `GUEST_BEDROOM` | Wardrobe, bed back panel, study table, false ceiling, TV unit |
| `KIDS_BEDROOM` | Wardrobe, study table, bed back panel, bookshelf, false ceiling |
| `DINING_AREA` | Crockery unit, bar counter, false ceiling, wall panel |
| `UTILITY` | Utility cabinet, wall shelf, loft storage |
| `POOJA_ROOM` | Pooja unit, wall panel, false ceiling |
| `FOYER` | Shoe rack, console table, wall panel, false ceiling |
| `BALCONY` | Storage unit, seating ledge |
| `STUDY_ROOM` | Study table, bookshelf, storage cabinet, false ceiling |
| `TV_UNIT_AREA` | TV unit, back panel, storage below |
| `BAR_UNIT` | Bar cabinet, bar counter, wall shelf |
| `SHOE_RACK_AREA` | Shoe rack, bench |

### Output Schema

The AI returns a structured JSON response validated against the `FloorPlanAnalysis` Pydantic model:

```json
{
  "property_type": "APARTMENT",
  "bhk_config": "3 BHK",
  "total_carpet_area_sqft": 1250.5,
  "rooms": [
    {
      "name": "Master Bedroom",
      "matched_key": "MASTER_BEDROOM",
      "length_ft": 14.0,
      "breadth_ft": 12.0,
      "height_ft": 10.0,
      "area_sqft": 168.0,
      "suggested_items": ["wardrobe", "bed_back_panel", "false_ceiling"]
    }
  ],
  "suggested_scope": ["Full Home Interior", "Modular Kitchen"],
  "suggested_package": "PREMIUM",
  "confidence": 0.85,
  "notes": "Clear floor plan with marked dimensions."
}
```

### Post-Processing

After the AI response is parsed:

1. Suggested items for each room are filtered against the room catalog (invalid items removed)
2. Room areas are calculated from length and breadth if not provided
3. Total carpet area is computed as the sum of all room areas if not provided by the AI
4. Package tier is validated against carpet area thresholds (BASIC < 800 sqft, STANDARD 800-1200, PREMIUM 1200-2000, LUXURY > 2000)

### Error Handling

The microservice implements a retry strategy:

1. First attempt with standard prompt (temperature 0.1)
2. If JSON parsing fails, retry with a stricter prompt (temperature 0.0) explicitly requesting raw JSON without markdown
3. If both attempts fail, return a descriptive error
