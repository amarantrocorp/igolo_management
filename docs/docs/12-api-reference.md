# API Reference

Base URL: `https://{tenant}.igolohomes.com/api/v1`

All endpoints require a valid JWT Bearer token in the `Authorization` header unless marked as **Public**. Tokens are obtained via the `/auth/token` endpoint.

Tenant context is derived from the subdomain or the `org_id` encoded in the JWT. All data is automatically scoped to the authenticated user's active organization.

---

## Authentication

### POST /auth/token

Login with email and password. Returns access and refresh tokens.

- **Auth:** Public (rate-limited to 5 requests per 60 seconds)
- **Content-Type:** `application/x-www-form-urlencoded`
- **Request Body:**
  - `username` (string, required) -- User email address
  - `password` (string, required) -- User password (max 128 characters)
- **Query Parameters:**
  - `tenant_slug` (string, optional) -- Subdomain slug for tenant-scoped login
- **Response:** `200 OK`
  ```json
  {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "user": { "id": "uuid", "email": "...", "full_name": "..." },
    "organizations": [{ "org_id": "uuid", "org_name": "...", "role": "MANAGER" }]
  }
  ```
- **Errors:**
  - `401` -- Invalid credentials
  - `403` -- User does not belong to the specified tenant
  - `422` -- Password too long
  - `429` -- Rate limit exceeded

### POST /auth/select-org

After login when a user belongs to multiple organizations, select which org to activate.

- **Auth:** Bearer token (any authenticated user)
- **Request Body:**
  ```json
  { "org_id": "uuid" }
  ```
- **Response:** `200 OK` -- Token object with org-scoped access token

### POST /auth/switch-org

Switch the active organization for a logged-in user.

- **Auth:** Bearer token (any authenticated user)
- **Request Body:**
  ```json
  { "org_id": "uuid" }
  ```
- **Response:** `200 OK` -- New token pair scoped to the selected organization

### POST /auth/refresh

Exchange a valid refresh token for a new access + refresh token pair.

- **Auth:** Public
- **Request Body:**
  ```json
  { "refresh_token": "eyJ..." }
  ```
- **Response:** `200 OK` -- Token object
- **Errors:**
  - `401` -- Invalid or expired refresh token

### GET /auth/me

Return the profile of the currently authenticated user with organization memberships.

- **Auth:** Bearer token (any authenticated user)
- **Response:** `200 OK`
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+91...",
    "is_active": true,
    "avatar_url": "https://...",
    "is_platform_admin": false,
    "created_at": "2026-01-15T10:30:00Z",
    "active_org_id": "uuid",
    "role_in_org": "MANAGER",
    "organizations": [
      {
        "id": "uuid",
        "org_id": "uuid",
        "org_name": "Igolo Homes",
        "org_slug": "igolo",
        "role": "MANAGER",
        "is_default": true
      }
    ]
  }
  ```

### POST /auth/register

Register a new user and create their organization.

- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "owner@company.com",
    "password": "securepassword",
    "full_name": "Jane Doe",
    "phone": "+919876543210",
    "company_name": "Dream Interiors",
    "company_slug": "dream-interiors"
  }
  ```
- **Response:** `201 Created` -- User object with token
- **Errors:**
  - `409` -- Email already registered or slug taken

### POST /auth/forgot-password

Request a password reset link. Always returns success to prevent user enumeration.

- **Auth:** Public
- **Request Body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response:** `200 OK`
  ```json
  { "message": "If the email exists, a reset link has been sent." }
  ```

### POST /auth/reset-password

Reset password using a valid reset token.

- **Auth:** Public
- **Request Body:**
  ```json
  {
    "token": "reset-token-string",
    "new_password": "newsecurepassword"
  }
  ```
- **Response:** `200 OK`
- **Errors:**
  - `400` -- Invalid or expired token

### GET /auth/invite-info

Return information about a pending invitation for the accept-invite page.

- **Auth:** Public
- **Query Parameters:**
  - `token` (string, required) -- Invitation token
- **Response:** `200 OK`
  ```json
  {
    "org_name": "Igolo Homes",
    "org_slug": "igolo",
    "role": "SALES",
    "email": "invited@example.com",
    "inviter_name": "Admin User"
  }
  ```
- **Errors:**
  - `404` -- Invalid or expired invitation token

### POST /auth/accept-invite

Accept an invitation. Creates a user account if needed, adds org membership, and returns tokens.

- **Auth:** Public
- **Request Body:**
  ```json
  {
    "token": "invite-token-string",
    "full_name": "New User",
    "password": "securepassword"
  }
  ```
- **Response:** `200 OK` -- Token object with user and org context
- **Errors:**
  - `400` -- Invalid or expired token
  - `409` -- User already a member of this organization

---

## CRM (Leads & Clients)

### POST /crm/leads

Create a new lead in the CRM pipeline.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "name": "Rahul Sharma",
    "contact_number": "+919876543210",
    "email": "rahul@example.com",
    "source": "Website",
    "status": "NEW",
    "assigned_to_id": "uuid",
    "budget_range": "10L-15L",
    "property_address": "Flat 402, Green Valley",
    "notes": "Interested in 3BHK renovation"
  }
  ```
- **Response:** `201 Created` -- LeadResponse object
- **Side Effects:** WhatsApp notification sent to assigned user (background task)

### GET /crm/leads

List leads with optional filters.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `status` (string, optional) -- Filter by lead status: `NEW`, `CONTACTED`, `QUALIFIED`, `QUOTATION_SENT`, `NEGOTIATION`, `CONVERTED`, `LOST`
  - `assigned_to` (UUID, optional) -- Filter by assigned user ID
  - `skip` (int, default 0) -- Pagination offset
  - `limit` (int, default 50, max 200) -- Page size
- **Response:** `200 OK` -- Array of LeadResponse objects

### GET /crm/leads/{lead_id}

Retrieve a single lead by ID.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- LeadResponse object
- **Errors:** `404` -- Lead not found

### PUT /crm/leads/{lead_id}

Update an existing lead.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Request Body:** LeadUpdate (all fields optional)
- **Response:** `200 OK` -- Updated LeadResponse
- **Errors:** `404` -- Lead not found

### POST /crm/leads/{lead_id}/convert

Convert a qualified lead into a client. Creates a User account with CLIENT role and a Client record linked to the lead.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `201 Created` -- ClientResponse object
- **Errors:**
  - `404` -- Lead not found
  - `400` -- Lead not in a convertible status

### POST /crm/leads/{lead_id}/activities

Log a follow-up activity on a lead.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "activity_type": "CALL",
    "notes": "Discussed budget and timeline",
    "follow_up_date": "2026-04-01T10:00:00Z"
  }
  ```
  `activity_type` options: `CALL`, `EMAIL`, `MEETING`, `NOTE`, `SITE_VISIT`
- **Response:** `201 Created` -- LeadActivityResponse

### GET /crm/leads/{lead_id}/activities

List all activities for a lead, ordered by date descending.

- **Auth:** BDE, SALES, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of LeadActivityResponse

---

## Quotations

### POST /quotes

Create a new quotation draft.

- **Auth:** SALES, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "lead_id": "uuid",
    "rooms": [
      {
        "name": "Master Bedroom",
        "area_sqft": 250,
        "items": [
          {
            "inventory_item_id": "uuid",
            "description": "Wardrobe with mirror finish",
            "quantity": 1,
            "unit_price": 45000,
            "markup_percentage": 20
          }
        ]
      }
    ],
    "valid_until": "2026-05-01",
    "notes": "Includes 1-year warranty"
  }
  ```
- **Response:** `201 Created` -- QuotationResponse with calculated totals

### GET /quotes

List quotations with optional filters.

- **Auth:** SALES, MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `lead_id` (UUID, optional) -- Filter by lead
  - `status` (string, optional) -- `DRAFT`, `FINALIZED`, `SENT`, `APPROVED`, `REJECTED`, `ARCHIVED`
  - `skip` (int, default 0)
  - `limit` (int, default 50, max 200)
- **Response:** `200 OK` -- Array of QuotationResponse

### GET /quotes/{quote_id}

Retrieve a single quotation with all rooms and items.

- **Auth:** SALES, MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `200 OK` -- QuotationResponse with nested rooms and items
- **Errors:** `404` -- Quotation not found

### POST /quotes/{quote_id}/finalize

Freeze a draft quotation into a versioned snapshot. Creates a new version (v1, v2, etc.) and locks prices.

- **Auth:** SALES, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Finalized QuotationResponse
- **Errors:**
  - `404` -- Quotation not found
  - `400` -- Quotation is not in DRAFT status

### PATCH /quotes/{quote_id}/status

Update the status of a quotation (approve, reject, archive).

- **Auth:** MANAGER, SUPER_ADMIN (for approve/reject), SALES (for archive)
- **Request Body:**
  ```json
  { "status": "APPROVED" }
  ```
- **Response:** `200 OK` -- Updated QuotationResponse

### GET /quotes/{quote_id}/pdf

Download the quotation as a professionally formatted PDF.

- **Auth:** SALES, MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `200 OK` -- PDF file stream (`application/pdf`)

### POST /quotes/{quote_id}/send

Send the quotation PDF to the client via email.

- **Auth:** SALES, MANAGER, SUPER_ADMIN
- **Response:** `200 OK`
  ```json
  { "message": "Quotation sent to client" }
  ```

---

## Projects

### POST /projects/convert/{quote_id}

Convert an approved quotation into an active project. This is the core conversion endpoint that:

1. Verifies the quotation is APPROVED
2. Creates a Project record
3. Auto-generates 6 standard sprints with calculated dates
4. Creates the project wallet

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "start_date": "2026-04-15"
  }
  ```
- **Response:** `201 Created` -- ProjectResponse with sprints
- **Errors:**
  - `400` -- Quotation not approved or already converted

### GET /projects

List all projects for the organization.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR, CLIENT
- **Query Parameters:**
  - `status` (string, optional) -- `NOT_STARTED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`
  - `skip` (int, default 0)
  - `limit` (int, default 50)
- **Response:** `200 OK` -- Array of ProjectResponse

### GET /projects/{project_id}

Retrieve a single project with financial summary.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR, CLIENT
- **Response:** `200 OK` -- ProjectResponse

### PATCH /projects/{project_id}

Partial update of project fields (status, dates, notes).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated ProjectResponse

### PUT /projects/{project_id}

Full update of project fields.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated ProjectResponse

### PATCH /projects/{project_id}/sprints/{sprint_id}

Update a sprint's dates or status. Triggers the ripple date update algorithm: if the end date changes, all dependent sprints shift automatically.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "status": "ACTIVE",
    "end_date": "2026-05-10",
    "notes": "Delayed due to material shortage"
  }
  ```
- **Response:** `200 OK` -- Updated SprintResponse

### POST /projects/{project_id}/daily-logs

Create a daily progress log for a project.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "sprint_id": "uuid",
    "notes": "Completed wardrobe carcass in Master Bedroom",
    "images": ["https://uploads.example.com/photo1.jpg"],
    "blockers": "Cement shortage",
    "visible_to_client": true
  }
  ```
- **Response:** `201 Created` -- DailyLogResponse

### GET /projects/{project_id}/daily-logs

List daily logs for a project with optional filters.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN, CLIENT
- **Query Parameters:**
  - `sprint_id` (UUID, optional)
  - `skip` (int, default 0)
  - `limit` (int, default 50)
- **Response:** `200 OK` -- Array of DailyLogResponse (clients see only `visible_to_client=true` logs)

### GET /projects/{project_id}/variation-orders

List all variation orders for a project.

- **Auth:** MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `200 OK` -- Array of VariationOrderResponse

### POST /projects/{project_id}/variation-orders

Create a variation order (scope change after contract).

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "description": "Add false ceiling in Guest Room",
    "additional_cost": 25000,
    "linked_sprint_id": "uuid"
  }
  ```
- **Response:** `201 Created` -- VariationOrderResponse

### PATCH /projects/{project_id}/variation-orders/{vo_id}

Update a variation order's status (approve, reject, mark paid).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated VariationOrderResponse

### GET /projects/{project_id}/materials

List all materials allocated or requested for a project.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- Array of project material records

### GET /projects/{project_id}/financial-health

Get the financial health snapshot of a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK`
  ```json
  {
    "total_agreed_value": 500000,
    "total_received": 300000,
    "total_spent": 220000,
    "current_balance": 80000,
    "pending_approvals": 15000,
    "effective_balance": 65000,
    "can_spend_more": true
  }
  ```

### POST /projects/{project_id}/transactions

Record a transaction against a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "category": "OUTFLOW",
    "source": "VENDOR",
    "amount": 15000,
    "description": "Plywood delivery",
    "related_po_id": "uuid",
    "proof_doc_url": "https://uploads.example.com/receipt.jpg"
  }
  ```
- **Response:** `201 Created` -- TransactionResponse

### GET /projects/{project_id}/transactions

List all transactions for a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `category` (string, optional) -- `INFLOW`, `OUTFLOW`
  - `source` (string, optional) -- `CLIENT`, `VENDOR`, `LABOR`, `PETTY_CASH`
  - `skip`, `limit`
- **Response:** `200 OK` -- Array of TransactionResponse

### GET /projects/{project_id}/pnl

Get profit and loss analysis for a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- P&L breakdown object

### POST /projects/{project_id}/documents

Attach a document to a project.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `201 Created` -- DocumentResponse

### GET /projects/{project_id}/documents

List all documents for a project.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR, CLIENT
- **Response:** `200 OK` -- Array of DocumentResponse

### DELETE /projects/{project_id}/documents/{doc_id}

Remove a document from a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `204 No Content`

---

## Inventory

### POST /inventory/items

Create a new inventory item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "name": "BWP Plywood 18mm",
    "category": "Plywood",
    "unit": "sqft",
    "base_price": 95.00,
    "selling_price": 120.00,
    "current_stock": 500,
    "reorder_level": 100,
    "hsn_code": "4412"
  }
  ```
- **Response:** `201 Created` -- ItemResponse

### GET /inventory/items

List all inventory items with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Query Parameters:**
  - `category` (string, optional)
  - `search` (string, optional) -- Name search
  - `low_stock` (bool, optional) -- Filter items below reorder level
  - `skip`, `limit`
- **Response:** `200 OK` -- Array of ItemResponse

### GET /inventory/items/{item_id}

Retrieve a single inventory item.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- ItemResponse

### PUT /inventory/items/{item_id}

Update an inventory item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated ItemResponse

### POST /inventory/items/{item_id}/suppliers

Link a vendor as a supplier for an item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "vendor_id": "uuid",
    "unit_cost": 90.00,
    "lead_time_days": 3
  }
  ```
- **Response:** `201 Created`

### GET /inventory/items/{item_id}/suppliers

List all suppliers for an item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of vendor-item relationships

### DELETE /inventory/items/{item_id}/suppliers/{vendor_id}

Remove a supplier link from an item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `204 No Content`

### GET /inventory/items/{item_id}/stock-history

Get the stock transaction ledger for an item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of StockTransaction records

### POST /inventory/vendors

Create a new vendor.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "name": "Greenply Industries",
    "contact_name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@greenply.com",
    "gst_number": "29AABCG1234A1Z5",
    "address": "Bengaluru, Karnataka"
  }
  ```
- **Response:** `201 Created` -- VendorResponse

### GET /inventory/vendors

List all vendors.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:** `skip`, `limit`, `search`
- **Response:** `200 OK` -- Array of VendorResponse

### GET /inventory/vendors/{vendor_id}

Retrieve a single vendor.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- VendorResponse

### PUT /inventory/vendors/{vendor_id}

Update a vendor.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated VendorResponse

### GET /inventory/vendors/{vendor_id}/performance

Get vendor performance metrics (total spend, on-time delivery rate).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- VendorPerformance object

### POST /inventory/purchase-orders

Create a new purchase order.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "vendor_id": "uuid",
    "is_project_specific": true,
    "project_id": "uuid",
    "items": [
      { "item_id": "uuid", "quantity": 100, "unit_price": 95.00 }
    ],
    "expected_delivery": "2026-04-20"
  }
  ```
- **Response:** `201 Created` -- PurchaseOrderResponse

### GET /inventory/purchase-orders

List purchase orders with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `status` (string, optional) -- `DRAFT`, `ORDERED`, `RECEIVED`, `CANCELLED`
  - `vendor_id` (UUID, optional)
  - `project_id` (UUID, optional)
  - `skip`, `limit`
- **Response:** `200 OK` -- Array of PurchaseOrderResponse

### POST /inventory/purchase-orders/{po_id}/receive

Mark a purchase order as received (GRN). For general stock, updates `Item.current_stock`. For project-specific, creates an expense record.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated PurchaseOrderResponse

### POST /inventory/stock/issue

Issue stock from warehouse to a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "item_id": "uuid",
    "project_id": "uuid",
    "quantity": 50
  }
  ```
- **Response:** `200 OK` -- StockTransaction record
- **Errors:**
  - `400` -- Insufficient stock
  - `402` -- Insufficient project funds

### GET /inventory/purchase-orders/{po_id}/pdf

Download the purchase order as a PDF.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- PDF file stream

---

## Labor

### POST /labor/teams

Create a new labor team.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "name": "Roy's Painting Crew",
    "leader_name": "Roy",
    "contact_number": "+919876543210",
    "specialization": "PAINTING",
    "payment_model": "DAILY_WAGE",
    "default_daily_rate": 800
  }
  ```
- **Response:** `201 Created` -- LaborTeamResponse

### GET /labor/teams

List all labor teams.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- Array of LaborTeamResponse

### GET /labor/teams/{team_id}

Retrieve a single labor team with workers.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- LaborTeamResponse with workers

### PUT /labor/teams/{team_id}

Update a labor team.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated LaborTeamResponse

### POST /labor/teams/{team_id}/workers

Add a worker to a team.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "name": "Suresh Kumar",
    "skill_level": "SKILLED",
    "daily_rate": 900
  }
  ```
  `skill_level` options: `HELPER`, `SKILLED`, `FOREMAN`
- **Response:** `201 Created` -- WorkerResponse

### POST /labor/attendance

Log daily attendance for a labor team on a project.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "project_id": "uuid",
    "sprint_id": "uuid",
    "team_id": "uuid",
    "date": "2026-04-15",
    "workers_present": 4,
    "total_hours": 8,
    "site_photo_url": "https://uploads.example.com/team_photo.jpg",
    "notes": "Completed wardrobe framing"
  }
  ```
- **Response:** `201 Created` -- AttendanceLogResponse with calculated cost

### GET /labor/attendance

List attendance logs with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Query Parameters:**
  - `project_id` (UUID, optional)
  - `team_id` (UUID, optional)
  - `date_from`, `date_to` (date, optional)
  - `status` (string, optional) -- `PENDING`, `APPROVED_BY_MANAGER`, `PAID`
  - `skip`, `limit`
- **Response:** `200 OK` -- Array of AttendanceLogResponse

### GET /labor/payroll

Get payroll summary grouped by team for a date range.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `week_start` (date, required)
  - `week_end` (date, required)
  - `project_id` (UUID, optional)
- **Response:** `200 OK` -- Payroll summary with team breakdowns and totals

### POST /labor/payroll/approve

Approve and process payroll for selected attendance logs. Creates outflow transactions in the project wallet.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "attendance_log_ids": ["uuid1", "uuid2"]
  }
  ```
- **Response:** `200 OK` -- Approval result with total paid
- **Errors:**
  - `402` -- Insufficient project funds

### GET /labor/teams/{team_id}/productivity

Get productivity metrics for a team (cost per sqft, average daily output).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Productivity metrics object

---

## Finance

### GET /finance/health

Get organization-wide financial health summary.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Aggregate financial metrics across all projects

### GET /finance/wallet/{project_id}

Get the project wallet balance and details.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- ProjectWallet object

### GET /finance/summary

Get transaction summary with period grouping.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `period` (string) -- `daily`, `weekly`, `monthly`
  - `date_from`, `date_to`
- **Response:** `200 OK` -- Aggregated transaction summaries

### GET /finance/aggregation

Get transaction totals aggregated by category.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Aggregation by category and source

### GET /finance/source-breakdown

Get expense breakdown by source (vendor, labor, petty cash).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Source-wise breakdown

### GET /finance/project-breakdown

Get financial breakdown across all projects.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Per-project financial summary

### GET /finance/transactions

List all transactions across the organization.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:**
  - `project_id` (UUID, optional)
  - `category` (string, optional) -- `INFLOW`, `OUTFLOW`
  - `source` (string, optional) -- `CLIENT`, `VENDOR`, `LABOR`, `PETTY_CASH`
  - `status` (string, optional) -- `PENDING`, `CLEARED`, `REJECTED`
  - `skip`, `limit`
- **Response:** `200 OK` -- Array of TransactionResponse

### POST /finance/transactions

Record a new transaction.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:** TransactionCreate object
- **Response:** `201 Created` -- TransactionResponse

### PATCH /finance/transactions/{txn_id}/verify

Verify (approve or reject) a pending transaction.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  { "status": "CLEARED" }
  ```
- **Response:** `200 OK` -- Updated TransactionResponse

### GET /finance/projects/{project_id}/transactions

List transactions for a specific project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of TransactionResponse

### POST /finance/budgets/{project_id}/line-items

Create budget line items for a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `201 Created`

### GET /finance/budgets/{project_id}/line-items

Get budget line items for a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK`

### PUT /finance/budgets/{project_id}/line-items/{item_id}

Update a budget line item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK`

### DELETE /finance/budgets/{project_id}/line-items/{item_id}

Delete a budget line item.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `204 No Content`

### GET /finance/budgets/{project_id}/vs-actual

Get budget vs actual comparison for a project.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Budget vs actual analysis

### GET /finance/export/transactions

Export transactions as CSV/Excel.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:** Date range filters, format (`csv` or `xlsx`)
- **Response:** `200 OK` -- File download

### GET /finance/export/payroll

Export payroll data as CSV/Excel.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- File download

### GET /finance/export/inventory

Export inventory data as CSV/Excel.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- File download

### GET /finance/export/cash-flow

Export cash flow report.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- File download

---

## Payments (Razorpay Integration)

### POST /payments/create-order

Create a Razorpay payment order for a client payment.

- **Auth:** CLIENT, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "project_id": "uuid",
    "amount": 100000,
    "description": "Milestone 2 payment"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "order_id": "order_xxx",
    "amount": 100000,
    "currency": "INR",
    "key_id": "rzp_xxx"
  }
  ```

### POST /payments/verify

Verify a completed Razorpay payment. Auto-creates a CLEARED inflow transaction and updates the project wallet.

- **Auth:** CLIENT, MANAGER, SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_string"
  }
  ```
- **Response:** `200 OK`
  ```json
  { "status": "verified", "transaction_id": "uuid" }
  ```
- **Errors:**
  - `400` -- Signature verification failed

---

## Invoices

### POST /invoices

Create a new invoice.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:** InvoiceCreate object (project_id, line items, tax details)
- **Response:** `201 Created` -- InvoiceResponse

### GET /invoices

List invoices with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN, CLIENT
- **Query Parameters:** `project_id`, `status`, `skip`, `limit`
- **Response:** `200 OK` -- Array of InvoiceResponse

### GET /invoices/{invoice_id}

Retrieve a single invoice.

- **Auth:** MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `200 OK` -- InvoiceResponse

### PATCH /invoices/{invoice_id}

Update an invoice (status, line items).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated InvoiceResponse

### POST /invoices/{invoice_id}/send

Send the invoice to the client via email.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated InvoiceResponse (status set to SENT)

### POST /invoices/{invoice_id}/mark-paid

Mark an invoice as paid.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated InvoiceResponse

### GET /invoices/{invoice_id}/pdf

Download the invoice as a GST-compliant PDF.

- **Auth:** MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `200 OK` -- PDF file stream

---

## Material Requests

### POST /material-requests

Create a material request (indent) from a site supervisor.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Request Body:** MaterialRequestCreate object
- **Response:** `201 Created` -- MaterialRequestResponse

### GET /material-requests

List material requests with optional filters.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Query Parameters:** `project_id`, `status`, `skip`, `limit`
- **Response:** `200 OK` -- Array of MaterialRequestResponse

### GET /material-requests/{request_id}

Retrieve a single material request.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- MaterialRequestResponse

### PATCH /material-requests/{request_id}/approve

Approve a material request.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated MaterialRequestResponse

### PATCH /material-requests/{request_id}/reject

Reject a material request.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated MaterialRequestResponse

### POST /material-requests/{request_id}/fulfill

Fulfill an approved request by issuing stock or creating a PO.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated MaterialRequestResponse

---

## Work Orders

### POST /work-orders

Create a work order for a labor team.

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:** WorkOrderCreate object
- **Response:** `201 Created` -- WorkOrderResponse

### GET /work-orders

List work orders with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Query Parameters:** `project_id`, `team_id`, `status`, `skip`, `limit`
- **Response:** `200 OK` -- Array of WorkOrderResponse

### GET /work-orders/{wo_id}

Retrieve a single work order.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- WorkOrderResponse

### PATCH /work-orders/{wo_id}

Update a work order.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated WorkOrderResponse

### POST /work-orders/{wo_id}/ra-bills

Submit a running account (RA) bill against a work order.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `201 Created` -- RABillResponse

### PATCH /work-orders/{wo_id}/ra-bills/{bill_id}/status

Approve or reject an RA bill.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated RABillResponse

### GET /work-orders/{wo_id}/pdf

Download the work order as a PDF.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- PDF file stream

---

## Vendor Bills

### POST /vendor-bills

Create a vendor bill record (reconcile against a PO).

- **Auth:** MANAGER, SUPER_ADMIN
- **Request Body:** VendorBillCreate object (vendor_id, po_id, final_amount, file upload URL)
- **Response:** `201 Created` -- VendorBillResponse
- **Side Effects:** If price variance exceeds 10%, a price alert notification is created for managers

### GET /vendor-bills

List vendor bills with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:** `vendor_id`, `po_id`, `status`, `skip`, `limit`
- **Response:** `200 OK` -- Array of VendorBillResponse

### GET /vendor-bills/{bill_id}

Retrieve a single vendor bill.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- VendorBillResponse

### PATCH /vendor-bills/{bill_id}

Update a vendor bill (approve, adjust amount).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated VendorBillResponse

---

## Approvals

### POST /approvals/rules

Create an approval rule (e.g., POs above 50k need manager approval).

- **Auth:** SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "entity_type": "PURCHASE_ORDER",
    "condition": "amount > 50000",
    "approver_role": "MANAGER",
    "approver_user_id": "uuid"
  }
  ```
- **Response:** `201 Created` -- ApprovalRuleResponse

### GET /approvals/rules

List all approval rules.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of ApprovalRuleResponse

### DELETE /approvals/rules/{rule_id}

Delete an approval rule.

- **Auth:** SUPER_ADMIN
- **Response:** `204 No Content`

### POST /approvals/initiate

Initiate an approval flow for an entity (PO, VO, expense).

- **Auth:** Any authenticated user
- **Request Body:**
  ```json
  {
    "entity_type": "PURCHASE_ORDER",
    "entity_id": "uuid"
  }
  ```
- **Response:** `200 OK` -- Array of ApprovalLogResponse (one per required approver)

### PATCH /approvals/{log_id}

Process an approval (approve or reject).

- **Auth:** The designated approver
- **Request Body:**
  ```json
  {
    "action": "APPROVED",
    "comments": "Looks good, proceed"
  }
  ```
- **Response:** `200 OK` -- Updated ApprovalLogResponse

### GET /approvals/pending

Get all approvals pending for the current user.

- **Auth:** Any authenticated user
- **Response:** `200 OK` -- Array of ApprovalLogResponse

### GET /approvals/entity

Get approval status for a specific entity.

- **Auth:** Any authenticated user
- **Query Parameters:**
  - `entity_type` (string, required)
  - `entity_id` (UUID, required)
- **Response:** `200 OK` -- Array of ApprovalLogResponse

---

## Quality Management

### POST /quality/inspections

Create a quality inspection for a project sprint.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `201 Created` -- InspectionResponse

### GET /quality/inspections

List inspections with optional filters.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Query Parameters:** `project_id`, `sprint_id`, `status`, `skip`, `limit`
- **Response:** `200 OK` -- Array of InspectionResponse

### GET /quality/inspections/{inspection_id}

Retrieve a single inspection with checklist items.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- InspectionResponse

### PATCH /quality/inspections/{inspection_id}/items/{item_id}

Update the status of an inspection checklist item.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated inspection item

### POST /quality/inspections/{inspection_id}/complete

Mark an inspection as complete.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated InspectionResponse

### POST /quality/snags

Create a snag (defect) item.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN, CLIENT
- **Response:** `201 Created` -- SnagItemResponse

### GET /quality/snags

List snags with optional filters.

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN, CLIENT
- **Query Parameters:** `project_id`, `sprint_id`, `status`, `priority`, `skip`, `limit`
- **Response:** `200 OK` -- Array of SnagItemResponse

### PATCH /quality/snags/{snag_id}

Update a snag (assign, resolve, close).

- **Auth:** SUPERVISOR, MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated SnagItemResponse

### GET /quality/summary/{project_id}

Get quality summary for a project (inspection pass rate, open snags count).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Quality summary object

---

## Assets

### POST /assets

Register a new company asset (tools, equipment).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `201 Created` -- AssetResponse

### GET /assets

List all assets with optional filters.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Query Parameters:** `status`, `category`, `assigned_to_project`, `skip`, `limit`
- **Response:** `200 OK` -- Array of AssetResponse

### GET /assets/{asset_id}

Retrieve a single asset.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- AssetResponse

### PATCH /assets/{asset_id}

Update an asset.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Updated AssetResponse

### POST /assets/{asset_id}/assign

Assign an asset to a project or user.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `201 Created` -- AssetUsageLogResponse

### POST /assets/{asset_id}/return

Return an assigned asset.

- **Auth:** MANAGER, SUPER_ADMIN, SUPERVISOR
- **Response:** `200 OK` -- AssetUsageLogResponse

### GET /assets/{asset_id}/usage-logs

Get the usage history for an asset.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of AssetUsageLogResponse

---

## Notifications

### GET /notifications

List notifications for the current user.

- **Auth:** Any authenticated user
- **Query Parameters:**
  - `skip` (int, default 0)
  - `limit` (int, default 50)
- **Response:** `200 OK` -- Array of NotificationResponse

### GET /notifications/unread-count

Get the count of unread notifications.

- **Auth:** Any authenticated user
- **Response:** `200 OK`
  ```json
  { "count": 5 }
  ```

### PATCH /notifications/{notification_id}/read

Mark a single notification as read.

- **Auth:** Any authenticated user
- **Response:** `200 OK` -- Updated NotificationResponse

### POST /notifications/read-all

Mark all notifications as read for the current user.

- **Auth:** Any authenticated user
- **Response:** `200 OK`

---

## Users

### GET /users/me

Get the current user's profile (duplicate of `/auth/me` for convenience).

- **Auth:** Any authenticated user
- **Response:** `200 OK` -- UserResponse

### GET /users

List all users in the organization.

- **Auth:** MANAGER, SUPER_ADMIN
- **Query Parameters:** `role`, `is_active`, `skip`, `limit`
- **Response:** `200 OK` -- Array of UserResponse

### POST /users/create

Create a new internal staff user.

- **Auth:** SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "email": "newuser@company.com",
    "full_name": "New Staff",
    "password": "temppassword",
    "role": "SALES"
  }
  ```
- **Response:** `201 Created` -- UserResponse

### PATCH /users/{user_id}

Update a user's profile or role.

- **Auth:** SUPER_ADMIN (for role changes), or the user themselves (for profile updates)
- **Response:** `200 OK` -- Updated UserResponse

### DELETE /users/{user_id}

Deactivate a user (soft delete).

- **Auth:** SUPER_ADMIN
- **Response:** `204 No Content`

---

## Organization

### GET /org/settings

Get organization settings (name, logo, address, GST, branding).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- OrgSettingsResponse

### PATCH /org/settings

Update organization settings.

- **Auth:** SUPER_ADMIN
- **Response:** `200 OK` -- Updated OrgSettingsResponse

### GET /org/members

List all members of the organization.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- Array of OrgMemberResponse

### POST /org/invite

Invite a new member to the organization via email.

- **Auth:** SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "email": "invite@example.com",
    "role": "SALES"
  }
  ```
- **Response:** `201 Created`

### DELETE /org/members/{user_id}

Remove a member from the organization.

- **Auth:** SUPER_ADMIN
- **Response:** `204 No Content`

### PATCH /org/members/{user_id}/role

Change a member's role within the organization.

- **Auth:** SUPER_ADMIN
- **Request Body:**
  ```json
  { "role": "MANAGER" }
  ```
- **Response:** `200 OK` -- Updated OrgMemberResponse

### GET /org/usage

Get current organization usage stats (projects, members, storage).

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- OrgUsageResponse

### GET /org/billing

Get organization billing information and current plan.

- **Auth:** MANAGER, SUPER_ADMIN
- **Response:** `200 OK` -- OrgBillingResponse

---

## Billing (Subscription Plans)

### GET /billing/plans

List all available subscription plans.

- **Auth:** Public
- **Response:** `200 OK`
  ```json
  [
    {
      "id": "starter",
      "name": "Starter",
      "price_monthly": 0,
      "max_projects": 3,
      "max_members": 5,
      "features": ["CRM", "Quotations", "Basic Reports"]
    }
  ]
  ```

### GET /billing/current

Get the current billing status for the organization.

- **Auth:** SUPER_ADMIN
- **Response:** `200 OK` -- BillingStatusResponse

### POST /billing/subscribe

Subscribe to a plan or upgrade/downgrade.

- **Auth:** SUPER_ADMIN
- **Request Body:**
  ```json
  {
    "plan_id": "professional",
    "billing_cycle": "monthly"
  }
  ```
- **Response:** `200 OK` -- Razorpay order for payment

### POST /billing/verify-payment

Verify a subscription payment after Razorpay checkout.

- **Auth:** SUPER_ADMIN
- **Response:** `200 OK` -- VerifySubscriptionResponse

### POST /billing/cancel

Cancel the current subscription.

- **Auth:** SUPER_ADMIN
- **Response:** `200 OK` -- CancelSubscriptionResponse

---

## Platform Admin

These endpoints are restricted to platform administrators (super-admins of the SaaS platform itself, distinct from organization-level SUPER_ADMIN).

### POST /platform/organizations

Create a new organization.

- **Auth:** Platform Admin
- **Response:** `201 Created` -- OrganizationResponse

### GET /platform/organizations

List all organizations on the platform.

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Array of OrganizationResponse

### GET /platform/organizations/{org_id}

Retrieve a single organization.

- **Auth:** Platform Admin
- **Response:** `200 OK` -- OrganizationResponse

### PATCH /platform/organizations/{org_id}

Update an organization's details.

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Updated OrganizationResponse

### DELETE /platform/organizations/{org_id}

Permanently delete an organization and all its data.

- **Auth:** Platform Admin
- **Response:** `204 No Content`

### POST /platform/organizations/{org_id}/suspend

Suspend an organization (disables access for all members).

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Updated OrganizationResponse

### POST /platform/organizations/{org_id}/activate

Reactivate a suspended organization.

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Updated OrganizationResponse

### PATCH /platform/organizations/{org_id}/plan

Change an organization's subscription plan (admin override).

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Updated OrganizationResponse

### POST /platform/organizations/{org_id}/members

Add a member to an organization.

- **Auth:** Platform Admin
- **Response:** `201 Created`

### DELETE /platform/organizations/{org_id}/members/{user_id}

Remove a member from an organization.

- **Auth:** Platform Admin
- **Response:** `204 No Content`

### GET /platform/organizations/{org_id}/members

List members of an organization.

- **Auth:** Platform Admin
- **Response:** `200 OK` -- Array of member objects

### POST /platform/organizations/{org_id}/invite

Invite a user to an organization.

- **Auth:** Platform Admin
- **Response:** `201 Created`

### GET /platform/stats

Get platform-wide statistics (total orgs, users, projects, revenue).

- **Auth:** Platform Admin
- **Response:** `200 OK`
  ```json
  {
    "total_organizations": 150,
    "active_organizations": 120,
    "total_users": 800,
    "total_projects": 350,
    "monthly_revenue": 250000
  }
  ```

---

## Upload

### POST /upload

Upload a file (image, PDF, document). Returns the URL of the uploaded file.

- **Auth:** Any authenticated user
- **Content-Type:** `multipart/form-data`
- **Query Parameters:**
  - `category` (string, required) -- Determines storage path: `site_photos`, `receipts`, `documents`, `avatars`, `logos`, `items`
- **Request Body:**
  - `file` -- The file to upload (max 50 MB)
- **Response:** `200 OK`
  ```json
  { "url": "https://igolohomes.com/uploads/site_photos/abc123.jpg" }
  ```
- **Errors:**
  - `413` -- File too large
  - `415` -- Unsupported file type

---

## Common Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Human-readable error message"
}
```

| Status Code | Meaning |
|-------------|---------|
| `400` | Bad request (validation error, invalid state transition) |
| `401` | Unauthorized (missing or invalid token) |
| `402` | Payment required (insufficient project funds) |
| `403` | Forbidden (insufficient role permissions) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, slug already taken) |
| `413` | Payload too large |
| `422` | Unprocessable entity (Pydantic validation failure) |
| `429` | Too many requests (rate limit exceeded) |
| `500` | Internal server error |

---

## Pagination

List endpoints support cursor-based pagination via `skip` and `limit` query parameters:

- `skip` (int, default 0) -- Number of records to skip
- `limit` (int, default 50, max 200) -- Number of records to return

Response headers do not include total count. Clients should fetch the next page until fewer records than `limit` are returned.

---

## Rate Limiting

The following endpoints have explicit rate limits:

| Endpoint | Limit |
|----------|-------|
| `POST /auth/token` | 5 requests per 60 seconds per IP |
| `POST /auth/forgot-password` | 3 requests per 60 seconds per IP |

Other endpoints are subject to general server-level rate limiting.
