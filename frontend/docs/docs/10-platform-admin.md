# Platform Administration & Multi-Tenancy

This guide covers the multi-tenant architecture, self-service registration, subscription billing, and the platform administration dashboard for the Igolo Interior ERP SaaS platform.

---

## Table of Contents

1. [Multi-Tenant Architecture](#multi-tenant-architecture)
2. [Self-Service Registration](#self-service-registration)
3. [Subscription and Billing](#subscription-and-billing)
4. [Platform Admin Dashboard](#platform-admin-dashboard)
5. [Organization Management](#organization-management)
6. [Platform Users](#platform-users)
7. [Platform Revenue](#platform-revenue)
8. [Platform Settings](#platform-settings)
9. [Invitation Flow](#invitation-flow)
10. [Tenant-Scoped Login](#tenant-scoped-login)
11. [Data Migration](#data-migration)

---

## Multi-Tenant Architecture

### How Tenancy Works

Igolo Interior ERP uses a **schema-per-tenant** isolation model on PostgreSQL. Every organization that registers on the platform receives its own PostgreSQL schema, completely separating its operational data from all other tenants.

The database is divided into two conceptual planes:

| Plane | Schema | Contains |
|---|---|---|
| **Control Plane** | `public` | `users`, `organizations`, `org_memberships`, `org_invitations` |
| **Data Plane** | `tenant_{slug}` | All business data (projects, leads, quotes, invoices, etc.) |

When an organization with slug `acme-designs` registers, the system creates a schema named `tenant_acme_designs`. This schema contains 37 isolated tables covering every aspect of the business -- projects, leads, quotations, invoices, inventory, labor, quality inspections, and more.

### Schema Naming Convention

Organization slugs are converted to safe PostgreSQL schema names using the following rule:

```
slug: "acme-designs-abc12345"
schema: "tenant_acme_designs_abc12345"
```

Non-alphanumeric characters (except underscores) are replaced with underscores. The `tenant_` prefix is always applied.

### Tenant Resolution via Middleware

The `TenantMiddleware` (defined in `backend/app/core/tenant_middleware.py`) resolves the active tenant on every authenticated request. Resolution happens through two methods, tried in order:

1. **X-Tenant-ID header** -- The frontend sends the organization slug in this header. The middleware looks up the corresponding `schema_name` from the `organizations` table.
2. **JWT `org_id` claim** -- If no header is present, the middleware extracts the `org_id` from the decoded JWT token and resolves the schema from there.

The resolved schema name is stored on `request.state.tenant_schema`. Downstream database sessions use this value to set the PostgreSQL `search_path`, ensuring all queries execute against the correct tenant schema.

Certain paths bypass tenant resolution entirely:

- `/auth/*` -- Authentication routes (control plane)
- `/platform/*` -- Platform admin routes (cross-tenant)
- `/billing/*` -- Subscription management
- `/health`, `/docs`, `/redoc`, `/openapi` -- Infrastructure endpoints
- `/uploads/*` -- Static file serving

An in-memory cache maps `org_id` and `slug` values to schema names, avoiding a database lookup on every request. The cache is invalidated when an organization is updated or deleted.

### Data Isolation Guarantees

Every tenant's data is physically separated at the PostgreSQL schema level. A query executed within one tenant's context cannot read or modify another tenant's data because the `search_path` is scoped to a single schema.

Control plane tables (`users`, `organizations`, `org_memberships`, `org_invitations`) live in the `public` schema and are shared across tenants. These are accessed through platform-level endpoints that enforce their own authorization checks.

### File Storage Isolation

Uploaded files follow a tenant-scoped directory structure:

```
uploads/{org_id}/{category}/{filename}
```

For example:

```
uploads/550e8400-e29b-41d4-a716-446655440000/site_photos/photo_001.jpg
uploads/550e8400-e29b-41d4-a716-446655440000/documents/quotation_v2.pdf
uploads/550e8400-e29b-41d4-a716-446655440000/receipts/payment_proof.png
```

In production, files are stored in AWS S3 with the same key structure. In local development, they are stored on the filesystem under the `uploads/` directory. The `org_id` prefix ensures that one tenant's files are never accessible to another tenant's sessions.

### Tenant-Specific Tables (Data Plane)

The following 37 tables are created inside each tenant schema:

| Category | Tables |
|---|---|
| **Projects** | `projects`, `project_sprints`, `project_rooms` |
| **CRM** | `leads`, `lead_activities` |
| **Quotations** | `quotations`, `quotation_items` |
| **Invoices** | `invoices`, `invoice_items` |
| **Material** | `material_requests`, `material_request_items` |
| **Work Orders** | `work_orders`, `work_order_items` |
| **Inventory** | `inventory_items`, `stock_movements`, `purchase_orders`, `purchase_order_items` |
| **Vendors** | `vendors`, `vendor_categories`, `vendor_bills`, `vendor_bill_items` |
| **Finance** | `expenses`, `expense_categories`, `budget_items` |
| **Labor** | `labor_entries`, `labor_contractors`, `labor_attendance` |
| **Quality** | `quality_checklists`, `quality_checklist_items`, `quality_inspections` |
| **Assets** | `assets`, `usage_logs` |
| **Approvals** | `approvals` |
| **Documents** | `documents` |
| **Notifications** | `notifications` |
| **Auth** | `password_reset_tokens` |
| **Messaging** | `whatsapp_message_log` |

---

## Self-Service Registration

### Public Registration Endpoint

New organizations register at `/register` (frontend) which calls `POST /api/v1/auth/register` on the backend.

**Registration form fields:**

| Field | Validation | Required |
|---|---|---|
| Company Name | 2-255 characters | Yes |
| Full Name | 2-255 characters | Yes |
| Email | Valid email, must be unique | Yes |
| Password | Min 8 chars, must include uppercase, lowercase, and digit | Yes |
| Phone | Up to 20 characters | No |

### What Happens on Registration

The registration process executes five sequential operations within a single database transaction:

1. **Validate** -- Checks that the email is not already taken and the password meets complexity requirements.
2. **Create Organization** -- Generates a slug from the company name plus a random suffix (e.g., `acme-designs-a1b2c3d4`), sets `subscription_status` to `TRIAL`, and sets `trial_expires_at` to 14 days from now.
3. **Create User** -- Creates the owner account with `role = SUPER_ADMIN` and `is_active = True`.
4. **Create OrgMembership** -- Links the user to the organization with role `SUPER_ADMIN` and `is_default = True`.
5. **Provision Tenant Schema** -- Creates the PostgreSQL schema (`tenant_{slug}`) and provisions all 37 data plane tables inside it.

After the transaction commits, the system:

- Issues JWT access and refresh tokens so the user is immediately logged in.
- Sends a welcome email with a link to the dashboard.

**Response payload:**

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user_id": "550e8400-...",
  "org_id": "7c9e6679-...",
  "org_slug": "acme-designs-a1b2c3d4",
  "message": "Welcome! Your 14-day free trial has started."
}
```

### 14-Day Free Trial

Every new organization starts on a free trial with these defaults:

| Setting | Value |
|---|---|
| Plan Tier | `FREE` |
| Subscription Status | `TRIAL` |
| Trial Duration | 14 days |
| Max Users | 3 |
| Max Projects | 2 |
| Max Leads | 50 |
| Storage | 1 GB |

The trial expiry is enforced by the `TrialEnforcementMiddleware`. When the trial expires, all API requests return `402 Trial expired. Please upgrade.`

### Onboarding Wizard

After registration, the frontend presents a 3-step onboarding wizard:

1. **Company Setup** -- Upload logo, enter company address, GST number (optional).
2. **Invite Team** -- Send email invitations to team members with role assignment (Manager, BDE, Sales, Supervisor).
3. **Quick Start** -- Guided tour of key features: creating your first lead, building a quotation, and starting a project.

### Welcome Email

A welcome email is sent asynchronously (fire-and-forget) using the `welcome.html` Jinja2 template. It includes:

- The user's name and company name
- Confirmation that the 14-day trial has started
- A direct link to the dashboard (tenant subdomain in production, main domain in local development)

---

## Subscription and Billing

### Plan Tiers

| Feature | Free Trial | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Price** | Free (14 days) | Rs. 999/month | Rs. 2,999/month | Custom |
| **Users** | 3 | 10 | 25 | Unlimited |
| **Projects** | 2 | 10 | 50 | Unlimited |
| **Leads** | 50 | 500 | 5,000 | Unlimited |
| **Storage** | 1 GB | 5 GB | 25 GB | 100 GB |
| **WhatsApp Notifications** | No | Yes | Yes | Yes |
| **AI Floor Plan Analysis** | No | No | Yes | Yes |

Plan limits are defined in `backend/app/core/plan_limits.py` and enforced at the service layer. When a limit is reached, the system returns a `402` response with a message indicating which limit was hit and suggesting an upgrade.

For Enterprise plans, limits are set to `-1` (unlimited) for users, projects, and leads.

### Subscription Statuses

| Status | Meaning | System Behavior |
|---|---|---|
| `TRIAL` | Organization is within its 14-day free trial | Full access until `trial_expires_at` |
| `ACTIVE` | Paid subscription is current | Full access per plan tier |
| `PAST_DUE` | Payment overdue | Read-only mode (GET requests allowed, writes blocked) |
| `SUSPENDED` | Account manually suspended by platform admin | All requests return `403` |
| `CANCELLED` | Subscription cancelled | Treated as expired |

### Trial Enforcement Middleware

The `TrialEnforcementMiddleware` (defined in `backend/app/core/trial_middleware.py`) runs on every authenticated request and enforces subscription rules:

- **SUSPENDED**: Returns `403 Account suspended. Contact support.` for all requests.
- **TRIAL + expired**: Returns `402 Trial expired. Please upgrade.` for all requests.
- **PAST_DUE**: Allows `GET`, `HEAD`, and `OPTIONS` requests (read-only). Returns `402 Your subscription is past due. Only read access is available.` for all write operations.
- **ACTIVE** or **valid TRIAL**: Passes through normally.

The middleware skips these paths: `/auth/*`, `/billing/*`, `/platform/*`, `/health`, `/docs`, `/redoc`, `/openapi`. Platform admins (`is_platform_admin = True`) bypass all subscription checks.

### Upgrade via Razorpay

Organizations upgrade their plan through the Billing page in the dashboard:

1. **Select Plan** -- User chooses Starter, Pro, or Enterprise and selects monthly or yearly billing.
2. **Create Order** -- `POST /api/v1/billing/subscribe` creates a Razorpay order with the appropriate amount.
3. **Payment** -- Razorpay checkout opens in the browser. User completes payment.
4. **Verify** -- `POST /api/v1/billing/verify-payment` verifies the Razorpay signature and activates the subscription.
5. **Activation** -- Organization's `subscription_status` changes to `ACTIVE`, `plan_tier` is updated, and `max_users`/`max_projects` limits are adjusted.

**Razorpay pricing (in paise):**

| Plan | Monthly | Yearly |
|---|---|---|
| Starter | 99,900 (Rs. 999) | 9,99,900 (Rs. 9,999) |
| Pro | 2,99,900 (Rs. 2,999) | 29,99,900 (Rs. 29,999) |
| Enterprise | Custom | Custom |

Cancellation is available to org-level `SUPER_ADMIN` users via `POST /api/v1/billing/cancel`.

### Trial Banner

The frontend dashboard displays a trial banner that adapts based on the remaining trial days:

- **More than 3 days remaining**: Yellow banner showing "X days left in your free trial. Upgrade now."
- **3 days or fewer**: Red banner with urgency messaging.
- **Expired**: Redirect to the billing page with an upgrade prompt.

---

## Platform Admin Dashboard

### Who Is a Platform Admin

A platform admin is a user with `is_platform_admin = True` on the `users` table. This flag is separate from the organization-level `SUPER_ADMIN` role:

| Concept | Scope | Purpose |
|---|---|---|
| `is_platform_admin` | Global (cross-tenant) | Manages all organizations, billing, and platform settings |
| `SUPER_ADMIN` role | Organization-level | Manages their own organization's users, settings, and data |

A user can be both a platform admin and an org-level SUPER_ADMIN, but the two are independent. Platform admin status is typically set directly in the database or via the seed script.

All platform admin endpoints are gated by the `_require_platform_admin` dependency, which checks `user.is_platform_admin` and returns `403 Platform admin access required` if the flag is not set.

### Dashboard Overview (`/dashboard/platform`)

The platform admin dashboard is the central command center. It displays:

**KPI Cards:**

| Metric | Description |
|---|---|
| Total Organizations | Count of all registered organizations |
| Active Trials | Organizations with `subscription_status = TRIAL` |
| Paying Customers | Organizations with `subscription_status = ACTIVE` |
| MRR (Monthly Recurring Revenue) | Sum of monthly plan prices for all active subscriptions |
| Trial Conversion Rate | `paying / (paying + cancelled) * 100` |
| Suspended Accounts | Organizations with `subscription_status = SUSPENDED` |

**Charts:**

- **Revenue Trend** -- An `AreaChart` (Recharts) showing MRR over time, plotted with a gradient fill.
- **Plan Distribution** -- A `PieChart` showing the breakdown of organizations by plan tier (Free, Starter, Pro, Enterprise).

**Activity Feed:**

A chronological feed of recent platform events (new registrations, plan upgrades, subscription cancellations, suspensions).

**Trials Expiring Soon:**

An alert section listing organizations whose free trials expire within the next 7 days, with quick action links to contact the org admin or extend the trial.

### Platform Stats API

`GET /api/v1/platform/stats` returns the following payload (platform admin only):

```json
{
  "total_organizations": 45,
  "total_users": 312,
  "active_projects": 87,
  "active_trials": 12,
  "paying_customers": 28,
  "suspended_count": 2,
  "mrr": 119972,
  "trial_conversion_rate": 65.1
}
```

MRR is calculated server-side by summing the monthly price for each organization with `subscription_status = ACTIVE`:

| Plan | Monthly Price (Rs.) |
|---|---|
| FREE | 0 |
| STARTER | 2,999 |
| PRO | 7,999 |
| ENTERPRISE | 19,999 |

---

## Organization Management

### Organization List (`/dashboard/platform/organizations`)

The organization management page presents a searchable, filterable list of all registered organizations.

**List columns:**

| Column | Description |
|---|---|
| Name | Organization display name |
| Slug | URL-safe identifier (used for subdomains) |
| Plan | Current plan tier badge (FREE, STARTER, PRO, ENTERPRISE) |
| Status | Subscription status badge (TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELLED) |
| Users | Count of active members |
| Created | Registration date |
| Actions | Expand, Suspend, Activate, Change Plan |

**Filters and search:**

- Free-text search by organization name or slug
- Filter by plan tier
- Filter by subscription status

### Creating a New Organization

Platform admins can create organizations directly via the dashboard or API:

`POST /api/v1/platform/organizations`

```json
{
  "name": "Premier Interiors",
  "slug": "premier-interiors",
  "plan_tier": "STARTER",
  "max_users": 10,
  "max_projects": 10
}
```

This creates the organization record, generates the schema name (`tenant_premier_interiors`), and provisions the tenant schema with all 37 tables.

### Organization Detail View

Expanding an organization in the list reveals:

- **Organization details**: Name, slug, schema name, plan tier, subscription status, trial expiry date, creation date
- **Members list**: All active members with their roles, loaded via `GET /api/v1/platform/organizations/{org_id}/members`
- **Subscription info**: Current plan, status, trial days remaining (if applicable)

### Organization Actions

| Action | API Endpoint | Effect |
|---|---|---|
| **Suspend** | `POST /api/v1/platform/organizations/{org_id}/suspend` | Sets `subscription_status = SUSPENDED` and `is_active = False`. All requests from this org return 403. |
| **Activate** | `POST /api/v1/platform/organizations/{org_id}/activate` | Sets `subscription_status = ACTIVE` and `is_active = True`. Restores full access. |
| **Change Plan** | `PATCH /api/v1/platform/organizations/{org_id}/plan` | Overrides the plan tier. Payload: `{"plan_tier": "PRO"}` |
| **Delete** | `DELETE /api/v1/platform/organizations/{org_id}` | Soft-deletes the organization (deactivates and cancels subscription). |
| **Invite Member** | `POST /api/v1/platform/organizations/{org_id}/invite` | Sends an invitation email to join the specified org. Payload: `{"email": "user@example.com", "role": "SALES"}` |

### Updating Organization Details

`PATCH /api/v1/platform/organizations/{org_id}` accepts partial updates:

```json
{
  "name": "Premier Interiors Pvt. Ltd.",
  "max_users": 25
}
```

Only provided fields are updated; omitted fields remain unchanged.

---

## Platform Users

### Cross-Organization User Directory (`/dashboard/platform/users`)

The platform users page provides a global view of all users across all organizations.

**Columns:**

| Column | Description |
|---|---|
| Name | User's full name |
| Email | Login email address |
| Role | Organization-level role (SUPER_ADMIN, MANAGER, BDE, SALES, SUPERVISOR, CLIENT, LABOR_LEAD) |
| Organization | The organization(s) the user belongs to |
| Status | Active or inactive |
| Platform Admin | Whether `is_platform_admin` is set |

**Search and filter:**

- Search by name or email (free-text)
- Filter by role
- Filter by organization

This view is read-only from the platform users page. To modify a user's membership or role, navigate to the specific organization's detail view.

---

## Platform Revenue

### Revenue Dashboard (`/dashboard/platform/revenue`)

The revenue page provides financial analytics for the platform.

**Key Metrics:**

| Metric | Calculation |
|---|---|
| MRR | Sum of monthly plan prices for all `ACTIVE` subscriptions |
| Total Customers | Count of organizations with `ACTIVE` status |
| Average Revenue Per Account | MRR / Total Customers |

**Charts:**

- **Revenue by Plan** -- A `BarChart` showing MRR contribution broken down by plan tier (Starter, Pro, Enterprise).
- **Subscription Status Distribution** -- A `PieChart` showing the proportion of organizations in each subscription state (Trial, Active, Past Due, Suspended, Cancelled).

**Plan Pricing Reference:**

A summary table of current plan pricing is displayed for quick reference during customer conversations.

**Revenue Projections:**

Based on current active subscriptions and trial conversion rates, the dashboard estimates projected monthly and annual revenue.

---

## Platform Settings

### Settings Page (`/dashboard/platform/settings`)

The platform settings page is organized into sections:

**Platform Information:**

| Setting | Description |
|---|---|
| Platform Name | Display name (e.g., "Igolo Interior ERP") |
| Support Email | Contact email shown to tenants |
| Default Trial Duration | Number of days for free trials (default: 14) |

**Plan Configuration Reference:**

A read-only table showing the current plan limits for each tier. Changes to plan limits require a code deployment (defined in `backend/app/core/plan_limits.py`).

**Email Templates:**

Lists the available email templates used by the platform:

| Template | Purpose |
|---|---|
| `welcome.html` | Sent on registration |
| `generic_notification.html` | Used for invitations and general alerts |
| Password reset | Sent when users request a password reset |

**Danger Zone:**

Actions that require extra caution:

| Action | Description |
|---|---|
| Purge Inactive Organizations | Remove organizations that have been cancelled or inactive beyond a threshold |
| Export Platform Data | Generate a CSV/JSON export of all organizations, users, and subscription data |

These actions require confirmation dialogs before execution.

---

## Invitation Flow

### How Invitations Work

The platform supports two invitation paths:

1. **Platform admin invites a user to any organization** -- Via `POST /api/v1/platform/organizations/{org_id}/invite`.
2. **Org admin invites members to their own organization** -- Via `POST /api/v1/org/members/invite`.

Both paths use the same underlying `invite_member` service function.

### Invitation Process

**Step 1: Create Invitation**

The system:
- Checks whether the organization has reached its user limit (`max_users` from the plan tier). If so, returns `400 User limit reached`.
- Checks whether the email is already an active member of the organization.
- Checks whether a pending (unexpired, unaccepted) invitation already exists for this email.
- Generates a secure token (`secrets.token_urlsafe(32)`).
- Creates an `OrgInvitation` record with a 7-day expiry.
- Sends an invitation email.

**Step 2: Invitation Email**

The email is sent using the `generic_notification.html` template and contains:
- The organization name
- The assigned role
- A call-to-action button linking to the accept page

The accept link always uses the main domain (not a subdomain), since the invited user may not have an account yet:

```
https://igolohomes.com/accept-invite?token=abc123...
```

**Step 3: Accept Invitation**

The accept page (`/accept-invite`) calls `GET /api/v1/auth/invite-info?token=...` to display invitation details and determine whether the user already has an account.

Two scenarios:

| Scenario | User Action | Backend Action |
|---|---|---|
| **Existing user** | Click "Accept Invitation" | Creates `OrgMembership` linking user to org. Issues new tokens. |
| **New user** | Fill in name and password, then accept | Creates `User` record + `OrgMembership`. Issues tokens. |

If a deactivated membership already exists (the user was previously removed), it is reactivated with the new role.

**Step 4: Post-Accept**

After acceptance, the user receives JWT tokens scoped to the new organization and is redirected to the dashboard. The invitation record is marked as `accepted = True`.

### Multi-Org Membership

A single user can belong to multiple organizations. Each membership has:

| Field | Description |
|---|---|
| `user_id` | The user's UUID |
| `org_id` | The organization's UUID |
| `role` | The user's role within this organization |
| `is_default` | Whether this is the user's default organization |
| `is_active` | Whether the membership is currently active |

When a user with multiple memberships logs in (on the main domain), they are presented with an organization selection screen. Logging in via a tenant subdomain automatically selects that organization.

---

## Tenant-Scoped Login

### Login Routing Rules

The system enforces strict login scoping based on the domain:

| Domain | Who Can Login | Behavior |
|---|---|---|
| `igolohomes.com/login` | Platform admins only | Must have `is_platform_admin = True` |
| `{slug}.igolohomes.com/login` | Members of that organization | Must have an active `OrgMembership` for the org matching the subdomain |
| `/client-login` | Client users | Separate authentication flow for the client portal |

### How Tenant-Scoped Login Works

When a user attempts to log in at a subdomain (e.g., `acme-designs.igolohomes.com/login`):

1. The frontend extracts the subdomain from the URL and sends it as the `tenant_slug` parameter in the login request.
2. The backend's `login_user` service function receives the `tenant_slug`.
3. After authenticating the credentials, the service loads all of the user's active memberships with their associated organizations.
4. It filters for a membership where `organization.slug == tenant_slug` and `organization.is_active == True`.
5. If no matching membership is found, the request is rejected with `403 You are not a member of this organization. Please login at your own workspace.`
6. If a match is found, the JWT is issued with the `org_id` of that organization baked into the token.

### Cross-Tenant Login Prevention

A user who belongs to Organization A cannot log in at Organization B's subdomain. Even if the user provides valid credentials, the membership check will fail and the system returns a 403 error. This prevents any accidental or intentional cross-tenant data access.

### Main Domain Login (Platform Admins)

On the main domain (`igolohomes.com/login`), only platform admins are allowed to log in. If a non-platform-admin user attempts to log in at the main domain, they are directed to use their organization's subdomain instead.

For small deployments where a user belongs to exactly one organization, the system may allow main-domain login as a convenience, automatically selecting the user's sole organization.

### Client Portal Login

Client users authenticate through a separate `/client-login` endpoint. This provides a simplified login experience tailored to the client portal, which offers read-only project status views and payment functionality.

---

## Data Migration

### Migration Script

The `migrate_to_tenant_schemas.py` script handles moving existing data from the public schema into per-tenant schemas. This is used when upgrading an existing single-tenant deployment to the multi-tenant architecture.

**Location:** `backend/scripts/migrate_to_tenant_schemas.py`

### Usage

```bash
# Dry run -- count rows only, no changes made
python -m scripts.migrate_to_tenant_schemas --dry-run

# Migrate all organizations
python -m scripts.migrate_to_tenant_schemas

# Migrate a single organization
python -m scripts.migrate_to_tenant_schemas --org-id 550e8400-e29b-41d4-a716-446655440000

# Verbose logging
python -m scripts.migrate_to_tenant_schemas --verbose
```

### How It Works

The script iterates over all organizations that have a `schema_name` configured and migrates their data table by table:

1. **Discovery** -- Finds all organizations with a non-null `schema_name`.
2. **Schema Verification** -- Confirms the tenant schema exists (creates it if needed via `provision_tenant_tables`).
3. **Table-by-Table Migration** -- For each table in the migration order:
   - Queries `public.{table}` for rows matching `org_id = {org_id}`.
   - Inserts those rows into `{schema_name}.{table}`.
   - Respects foreign key dependencies by processing tables in dependency order.
4. **Statistics** -- Reports per-table row counts for each organization.

### Migration Order

Tables are migrated in dependency order to satisfy foreign key constraints. The script defines four tiers:

| Tier | Tables | Dependencies |
|---|---|---|
| **Tier 0** | `leads`, `vendors`, `items`, `labor_teams`, `assets`, `approval_rules` | No tenant-table FK dependencies |
| **Tier 1** | `lead_activities`, `clients`, `quotations`, `vendor_items`, `workers`, `notifications`, `password_reset_tokens` | Depend on Tier 0 |
| **Tier 2** | `quote_rooms`, `projects`, `purchase_orders` | Depend on Tier 1 |
| **Tier 3** | `quote_items`, `po_items`, `sprints`, `project_wallets`, `variation_orders`, `daily_logs`, `transactions`, `invoices`, `material_requests`, `budget_line_items`, `work_orders`, `inspections`, `vendor_bills`, `asset_usage_logs`, `project_documents`, `stock_transactions`, `attendance_logs` | Depend on Tier 2 |
| **Tier 4** | `invoice_items`, `material_request_items`, `ra_bills`, `inspection_items`, `snag_items`, `approval_logs` | Depend on Tier 3 |

### Flags

| Flag | Description |
|---|---|
| `--dry-run` | Counts rows per table per org without making any changes. Use this first to understand the scope of the migration. |
| `--org-id <uuid>` | Limits migration to a single organization. Useful for testing or incremental rollout. |
| `--verbose` | Enables detailed logging including per-row progress. |

### Idempotency

The migration script is idempotent. If a row already exists in the tenant schema (matching primary key), it is skipped rather than duplicated. This means the script can be safely re-run after a partial failure or interruption.

### Pre-Migration Checklist

1. **Backup the database** before running the migration.
2. Run with `--dry-run` first to verify row counts and identify any issues.
3. Test with `--org-id` on a single organization before migrating all orgs.
4. Verify the results by querying the tenant schema directly:
   ```sql
   SET search_path TO "tenant_acme_designs";
   SELECT count(*) FROM projects;
   ```
5. Update the application to use tenant-scoped sessions for all data plane queries.

---

## API Reference Summary

### Platform Admin Endpoints

All endpoints require `is_platform_admin = True`. Prefix: `/api/v1/platform`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/stats` | Platform-wide statistics (orgs, MRR, trials, etc.) |
| `POST` | `/organizations` | Create a new organization |
| `GET` | `/organizations` | List all organizations (paginated) |
| `GET` | `/organizations/{org_id}` | Get a single organization |
| `PATCH` | `/organizations/{org_id}` | Update organization details |
| `DELETE` | `/organizations/{org_id}` | Soft-delete an organization |
| `POST` | `/organizations/{org_id}/suspend` | Suspend an organization |
| `POST` | `/organizations/{org_id}/activate` | Activate a suspended organization |
| `PATCH` | `/organizations/{org_id}/plan` | Change an organization's plan tier |
| `POST` | `/organizations/{org_id}/invite` | Invite a user to an organization |
| `POST` | `/organizations/{org_id}/members` | Add a user directly to an organization |
| `GET` | `/organizations/{org_id}/members` | List members of an organization |
| `DELETE` | `/organizations/{org_id}/members/{user_id}` | Remove a member from an organization |

### Billing Endpoints

Prefix: `/api/v1/billing`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/plans` | Public plan details and pricing |
| `GET` | `/current` | Current org billing status |
| `POST` | `/subscribe` | Create Razorpay order for plan upgrade |
| `POST` | `/verify-payment` | Verify payment and activate subscription |
| `POST` | `/cancel` | Cancel subscription (SUPER_ADMIN only) |

### Registration Endpoint

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Self-service organization registration |

### Invitation Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/org/members/invite` | Org admin invites a member |
| `GET` | `/api/v1/auth/invite-info` | Get invitation details by token |
| `POST` | `/api/v1/auth/accept-invite` | Accept an invitation (creates user if needed) |
