# Financial Management Guide

This document covers the complete financial architecture of the IntDesignERP system, including the Project Wallet, transaction lifecycle, payment integration, labour payroll, and reporting.

---

## Table of Contents

1. [The Project Wallet System](#1-the-project-wallet-system)
2. [Transaction Types](#2-transaction-types)
3. [Transaction Lifecycle](#3-transaction-lifecycle)
4. [Client Payments (Money In)](#4-client-payments-money-in)
5. [Vendor Payments (Money Out)](#5-vendor-payments-money-out)
6. [Expenses Page](#6-expenses-page)
7. [Client Billing Page](#7-client-billing-page)
8. [Razorpay Integration](#8-razorpay-integration)
9. [Labour Payroll](#9-labour-payroll)
10. [Budget Management](#10-budget-management)
11. [Reports and Exports](#11-reports-and-exports)

---

## 1. The Project Wallet System

Every project in IntDesignERP operates as a **separate financial entity**. There is no pooled company account at the application logic level. Instead, each project maintains its own wallet that tracks all money flowing in and out.

### 1.1 Wallet Structure

The `ProjectWallet` model (table: `project_wallets`) stores four monetary fields:

| Field | Description |
|-------|-------------|
| `total_agreed_value` | Original quotation total plus any approved Variation Orders |
| `total_received` | Sum of all CLEARED inflow transactions |
| `total_spent` | Sum of all CLEARED outflow transactions |
| `pending_approvals` | Sum of PENDING outflow transactions (reserved funds) |

### 1.2 The Golden Formula

The system computes two balance figures from these fields:

**Current Balance** (what has actually been received minus what has actually been paid out):

```
Current Balance = Total Received - Total Spent
```

**Effective Balance** (the conservative figure used by the Spending Lock, which also reserves funds for pending outflows):

```
Effective Balance = Total Received - Total Spent - Pending Approvals
```

**Example:**

| Field | Amount |
|-------|--------|
| Total Agreed Value | 10,00,000 |
| Total Received | 4,00,000 |
| Total Spent | 2,50,000 |
| Pending Approvals | 75,000 |
| **Current Balance** | **1,50,000** |
| **Effective Balance** | **75,000** |

In this scenario, the manager can approve new expenses up to 75,000 before the system blocks further spending.

### 1.3 The Spending Lock

Before any outflow transaction (material purchase, labour payment, petty cash) is recorded, the system calls `authorize_expense()`. This function checks:

```
if effective_balance < amount_needed:
    raise InsufficientFundsException (HTTP 402)
```

The 402 response includes the current effective balance and the required amount, along with a message directing the user to request a top-up from the client.

**Key behaviour:**
- The lock applies at transaction creation time, not at approval time.
- When a PENDING outflow is created, `pending_approvals` increases immediately, which reduces the effective balance for subsequent transactions.
- This prevents double-spending: two managers cannot simultaneously approve expenses that would exceed the budget.

### 1.4 Wallet Initialization

When a quotation is accepted and converted into a project via `POST /projects/convert/{quote_id}`, the system:

1. Creates the `Project` record.
2. Creates a `ProjectWallet` with `total_agreed_value` set to the quotation total.
3. All other wallet fields start at 0.00.
4. Auto-generates the standard 6 sprints.

The wallet remains at zero balance until the client makes their first payment (typically the 20% advance).

### 1.5 Variation Orders and the Wallet

When a Variation Order (VO) is approved and paid:

1. `total_agreed_value` increases by the VO amount.
2. `total_received` increases by the VO payment.
3. The effective balance grows, unlocking spending capacity for the additional work.

**Strict rule:** VO work cannot begin until the VO payment is received and cleared.

### 1.6 Financial Health Endpoint

The `GET /finance/projects/{project_id}/financial-health` endpoint returns a complete snapshot:

```json
{
  "project_id": "abc-123",
  "total_agreed_value": 1000000.00,
  "total_received": 400000.00,
  "total_spent": 250000.00,
  "pending_approvals": 75000.00,
  "current_balance": 150000.00,
  "effective_balance": 75000.00,
  "can_spend_more": true,
  "estimated_margin_percent": 75.0
}
```

The `estimated_margin_percent` is calculated as:

```
Margin % = ((Total Agreed Value - Total Spent) / Total Agreed Value) * 100
```

This indicates how much of the quoted value remains after actual spending. When this drops below the planned margin (typically 30%), the project is trending toward loss-making territory.

**Access:** MANAGER and SUPER_ADMIN roles only.

---

## 2. Transaction Types

Every financial movement in the system is recorded as a `Transaction` (table: `transactions`). Transactions are classified along two axes: **category** and **source**.

### 2.1 Classification Matrix

| Category | Source | Description | Typical Trigger |
|----------|--------|-------------|-----------------|
| `INFLOW` | `CLIENT` | Client payments (advance, milestone payments, VO payments) | Manual entry or Razorpay verification |
| `OUTFLOW` | `VENDOR` | Material purchases, Purchase Order payments | PO delivery or vendor bill settlement |
| `OUTFLOW` | `LABOR` | Weekly payroll for daily-wage teams, contract milestone payments | Weekly payroll generation |
| `OUTFLOW` | `PETTY_CASH` | On-site expenses (tea, transport, diesel, small tools) | Supervisor uploads receipt photo |

### 2.2 Transaction Fields

Each transaction carries:

| Field | Purpose |
|-------|---------|
| `project_id` | Links the transaction to a specific project wallet |
| `category` | INFLOW or OUTFLOW |
| `source` | CLIENT, VENDOR, LABOR, or PETTY_CASH |
| `amount` | Decimal value (max 9,999,999,999.99) |
| `description` | Human-readable note |
| `reference_id` | Bank reference number, cheque number, or Razorpay payment ID |
| `related_po_id` | Links to a Purchase Order (for vendor payments) |
| `related_labor_log_id` | Links to an AttendanceLog (for labour payments) |
| `related_vo_id` | Links to a Variation Order (for VO-related transactions) |
| `recorded_by_id` | The user who created the transaction |
| `proof_doc_url` | URL to uploaded receipt, screenshot, or bank statement |
| `status` | PENDING, CLEARED, or REJECTED |

---

## 3. Transaction Lifecycle

All transactions follow a three-state lifecycle:

```
                    +-----------+
                    |           |
              +---->|  CLEARED  |
              |     |           |
              |     +-----------+
              |
+----------+--+
|          |
| PENDING  |
|          |
+----------+--+
              |
              |     +-----------+
              |     |           |
              +---->| REJECTED  |
                    |           |
                    +-----------+
```

### 3.1 State Transition Rules

**PENDING -> CLEARED** (via `PATCH /finance/transactions/{txn_id}/verify`):
- Requires MANAGER or SUPER_ADMIN role.
- For INFLOW: `wallet.total_received += amount` (wallet is credited).
- For OUTFLOW: `wallet.pending_approvals -= amount` and `wallet.total_spent += amount` (moves from reserved to spent).

**PENDING -> REJECTED:**
- For OUTFLOW: `wallet.pending_approvals -= amount` (reserved funds are released).
- For INFLOW: No wallet change (pending inflows do not affect the wallet).

### 3.2 Impact on Wallet by Status

| Transaction | Status | Impact on Wallet |
|-------------|--------|------------------|
| INFLOW | PENDING | No change. Wallet is NOT credited until verified. |
| INFLOW | CLEARED | `total_received += amount` |
| INFLOW | REJECTED | No change. |
| OUTFLOW | PENDING | `pending_approvals += amount` (funds reserved) |
| OUTFLOW | CLEARED | `pending_approvals -= amount`, `total_spent += amount` |
| OUTFLOW | REJECTED | `pending_approvals -= amount` (funds released) |

### 3.3 Notifications

When a transaction is created, all users with the MANAGER role receive an `APPROVAL_REQ` notification with the transaction details. When an INFLOW is cleared, the client receives a "Payment Confirmed" email with the amount and reference ID.

---

## 4. Client Payments (Money In)

Client payments enter the system through two channels: manual entry and online payment via Razorpay.

### 4.1 Manual Entry (Bank Transfer / Cheque)

**Workflow:**

1. Client makes a bank transfer or hands over a cheque.
2. Sales person or Manager navigates to the project finance view.
3. Creates a new INFLOW transaction:
   - Source: `CLIENT`
   - Amount: the transferred amount
   - Reference ID: bank transaction reference or cheque number
   - Proof: uploads a screenshot of the bank statement or cheque image
4. Transaction is created with status `PENDING`.
5. Manager or Super Admin reviews the proof and clicks "Verify".
6. System marks the transaction as `CLEARED` and credits the project wallet.

**API:**
```
POST /finance/transactions
{
  "project_id": "<uuid>",
  "category": "INFLOW",
  "source": "CLIENT",
  "amount": 200000.00,
  "description": "Advance payment - 20%",
  "reference_id": "NEFT-REF-123456",
  "proof_doc_url": "https://storage.example.com/receipts/advance.jpg"
}
```

**Roles:** SUPER_ADMIN, MANAGER, SALES, SUPERVISOR can record transactions. Only MANAGER and SUPER_ADMIN can verify them.

### 4.2 Online Payment (Razorpay)

Online payments bypass the manual verification step. See [Section 8: Razorpay Integration](#8-razorpay-integration) for the full flow. The key difference is that verified Razorpay payments are recorded directly as `CLEARED`, crediting the wallet immediately.

### 4.3 Milestone-Based Payment Schedule

The standard payment schedule for interior projects:

| Milestone | Percentage | Trigger Point |
|-----------|-----------|---------------|
| Advance | 20% | Before project starts (Sprint 1) |
| Before Carpentry | 30% | Sprint 3 complete, Sprint 4 about to begin |
| Before Finishing | 40% | Sprint 4 complete, Sprint 5 about to begin |
| Handover | 10% | Sprint 6 complete, final inspection passed |

**Example for a 10,00,000 project:**

| Milestone | Amount | Running Total |
|-----------|--------|---------------|
| Advance (20%) | 2,00,000 | 2,00,000 |
| Before Carpentry (30%) | 3,00,000 | 5,00,000 |
| Before Finishing (40%) | 4,00,000 | 9,00,000 |
| Handover (10%) | 1,00,000 | 10,00,000 |

The payment schedule is included in the quotation PDF sent to the client. Managers can customize these percentages per project when creating the quotation.

---

## 5. Vendor Payments (Money Out)

Vendor payments are tied to Purchase Orders and follow the Spending Lock.

### 5.1 Standard Vendor Payment Workflow

```
PO Created (DRAFT)
    |
    v
PO Sent to Vendor (ORDERED)
    |
    v
Goods Received (RECEIVED) --- triggers GRN logic
    |
    v
Transaction Created (OUTFLOW, VENDOR, PENDING)
    |                  ^
    |                  |--- Spending Lock check happens here
    v
Manager Verifies --> CLEARED
    |
    v
Wallet: pending_approvals -= amount
Wallet: total_spent += amount
```

### 5.2 General Stock vs Project-Specific

- **General Stock PO** (`is_project_specific = false`): When goods arrive, `Item.current_stock` increases. The cost is booked to company overhead, not a specific project wallet.
- **Project-Specific PO** (`is_project_specific = true`): The PO is tagged to a project. Stock count is NOT affected. Cost is debited from the tagged project's wallet.

### 5.3 Spending Lock in Action

When recording a vendor payment of 50,000:

1. System fetches the project wallet.
2. Calculates: `effective_balance = total_received - total_spent - pending_approvals`.
3. If `effective_balance >= 50,000`: transaction proceeds, `pending_approvals += 50,000`.
4. If `effective_balance < 50,000`: returns HTTP 402 with:
   ```json
   {
     "detail": "Project funds exhausted. Effective balance: 25,000.00, Required: 50,000.00. Request Top-up from Client."
   }
   ```

### 5.4 Vendor Bill Reconciliation

After delivery, vendors send actual bills which may differ from PO estimates:

1. Upload the vendor bill via `POST /vendor-bills`.
2. If the actual bill price differs from the PO price by more than 10%, a "Price Alert" notification is sent to Managers.
3. The `Item.base_price` in the master inventory is updated to reflect the latest purchase price, ensuring future quotations use accurate costs.

---

## 6. Expenses Page

**Route:** `/dashboard/expenses`

The expenses page provides a company-wide view of all outflow transactions.

### 6.1 Summary Cards

Four cards at the top of the page display:

| Card | Data Source |
|------|-------------|
| Total Expenses | Sum of all CLEARED OUTFLOW transactions |
| Vendor Expenses | Sum of CLEARED OUTFLOW where source = VENDOR |
| Labour Expenses | Sum of CLEARED OUTFLOW where source = LABOR |
| Petty Cash | Sum of CLEARED OUTFLOW where source = PETTY_CASH |

These totals are fetched from `GET /finance/summary` and `GET /finance/breakdown/source`.

### 6.2 Expense Table

A filterable, sortable table showing all OUTFLOW transactions:

**Columns:** Date, Project Name, Source (Vendor/Labor/Petty Cash), Description, Amount, Status (badge), Recorded By, Proof (link)

**Filters:**
- Source: VENDOR, LABOR, PETTY_CASH
- Status: PENDING, CLEARED, REJECTED
- Project: dropdown of all active projects
- Date Range: from/to date pickers

**API:** `GET /finance/transactions?category=OUTFLOW&source=VENDOR&status=PENDING&date_from=2026-01-01&date_to=2026-03-31`

### 6.3 Add Expense Form

Accessible to SUPER_ADMIN, MANAGER, SALES, and SUPERVISOR roles:

**Fields:**
- Project (required) - dropdown
- Source (required) - VENDOR, LABOR, or PETTY_CASH
- Amount (required) - numeric input
- Description (required) - text
- Reference ID (optional) - bank ref, cheque number
- Related PO (optional) - dropdown, shown only when source is VENDOR
- Proof Document (optional) - file upload (image/PDF)

### 6.4 Export to CSV

Click "Export" to download all filtered transactions as a CSV file.

**API:** `GET /finance/export/transactions?project_id=<uuid>&date_from=2026-01-01&date_to=2026-03-31`

Returns a `StreamingResponse` with `Content-Disposition: attachment; filename=transactions.csv`.

---

## 7. Client Billing Page

**Route:** `/dashboard/client-billing`

The client billing page provides a company-wide overview of invoicing and payment collection.

### 7.1 Company-Wide Billing Overview

Summary cards:

| Card | Description |
|------|-------------|
| Total Invoiced | Sum of all invoice `total_amount` values |
| Total Received | Sum of all CLEARED INFLOW transactions |
| Outstanding | Total Invoiced - Total Received |
| Overdue | Sum of invoices past `due_date` with status SENT |

### 7.2 Project Billing Summaries

A table showing per-project billing status:

**Columns:** Project Name, Agreed Value, Invoiced, Received, Outstanding, Status

**API:** `GET /finance/breakdown/project` provides inflow/outflow totals per project.

### 7.3 Invoice Creation

**API:** `POST /invoices`

Each invoice contains:
- `project_id` - the project being billed
- `invoice_number` - auto-generated, unique per organization
- `issue_date` and `due_date`
- `subtotal`, `tax_percent`, `tax_amount`, `total_amount`
- Line items with description, quantity, rate, amount, optional HSN code, and optional linked sprint

**Invoice Statuses:**

```
DRAFT --> SENT --> PAID
                   |
              OVERDUE (system auto-marks when due_date passes)
                   |
              CANCELLED
```

### 7.4 Payment Tracking

Each invoice links to INFLOW transactions via the project. The system tracks:
- How much of each invoice has been paid
- Which payments correspond to which milestones
- Overall collection efficiency (Received / Invoiced ratio)

---

## 8. Razorpay Integration

IntDesignERP integrates with Razorpay for online client payments. This allows clients to pay directly from the Client Portal.

### 8.1 Configuration

Add these environment variables to `.env`:

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

The `RAZORPAY_KEY_ID` is the publishable key sent to the frontend. The `RAZORPAY_KEY_SECRET` is used server-side for order creation and signature verification. Never expose the secret to the client.

### 8.2 Payment Flow

```
Client Portal                    Backend                      Razorpay
     |                              |                            |
     |  1. Click "Pay Rs. X"        |                            |
     |----------------------------->|                            |
     |                              |  2. POST create order      |
     |                              |--------------------------->|
     |                              |  3. Return order_id        |
     |                              |<---------------------------|
     |  4. Return order_id + key_id |                            |
     |<-----------------------------|                            |
     |                              |                            |
     |  5. Open Razorpay popup      |                            |
     |----------------------------------------------------->    |
     |  6. Client completes payment |                            |
     |<-----------------------------------------------------    |
     |                              |                            |
     |  7. Send payment_id +        |                            |
     |     order_id + signature     |                            |
     |----------------------------->|                            |
     |                              |  8. Verify HMAC signature  |
     |                              |  (server-side using secret)|
     |                              |                            |
     |                              |  9. If valid:              |
     |                              |     - Create CLEARED       |
     |                              |       INFLOW transaction   |
     |                              |     - Credit wallet        |
     |                              |     - Send confirmation    |
     |  10. Return success          |                            |
     |<-----------------------------|                            |
```

### 8.3 Step-by-Step Breakdown

**Step 1-4: Order Creation**

The frontend `RazorpayButton` component calls `POST /payments/create-order`:

```json
{
  "project_id": "<uuid>",
  "amount": 200000.00,
  "description": "Advance payment for Villa 402"
}
```

The backend creates a Razorpay order and returns:

```json
{
  "razorpay_order_id": "order_xxxxxxxxxxxx",
  "amount": 20000000,
  "currency": "INR",
  "key_id": "rzp_live_xxxxxxxxxxxx"
}
```

Note: Razorpay amounts are in paise (100 paise = 1 INR), so 2,00,000 INR = 20000000 paise.

**Step 5-6: Checkout Popup**

The Razorpay JS SDK opens a modal with card/UPI/netbanking options. The client completes payment within the popup.

**Step 7-9: Verification**

The frontend sends the Razorpay response to `POST /payments/verify`:

```json
{
  "razorpay_order_id": "order_xxxxxxxxxxxx",
  "razorpay_payment_id": "pay_xxxxxxxxxxxx",
  "razorpay_signature": "hmac_sha256_signature",
  "project_id": "<uuid>",
  "amount": 200000.00,
  "description": "Advance payment for Villa 402"
}
```

The backend verifies the HMAC-SHA256 signature using the `RAZORPAY_KEY_SECRET`. If valid, it:

1. Creates a `Transaction` with category=INFLOW, source=CLIENT, status=**CLEARED** (not PENDING).
2. Credits the project wallet: `total_received += amount`.
3. Sends a "Payment Confirmed" email to the client.

**Step 10: Success**

```json
{
  "success": true,
  "transaction_id": "<uuid>",
  "message": "Payment verified and recorded successfully."
}
```

### 8.4 Access Control

The following roles can initiate Razorpay payments:
- **CLIENT** - from the Client Portal
- **MANAGER** - on behalf of the client
- **SUPER_ADMIN** - full access

### 8.5 Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Script fails to load | Toast: "Failed to load payment gateway" |
| Order creation fails | Toast with error message from backend |
| Payment fails (card declined, etc.) | Razorpay shows error in popup; toast on dismiss |
| Signature verification fails | HTTP 400: "Payment verification failed. Signature mismatch." |
| Verification API call fails | Toast: "Payment was processed but verification failed. Please contact your project manager." |

In the rare case where payment succeeds but verification fails (network issue), the Razorpay webhook (if configured) can catch the event and reconcile automatically.

---

## 9. Labour Payroll

Labour costs are tracked through attendance logs and settled through weekly payroll runs.

### 9.1 Labour Team Structure

| Entity | Description |
|--------|-------------|
| `LaborTeam` | A crew with a leader, specialization (CIVIL, CARPENTRY, PAINTING, ELECTRICAL, PLUMBING, GENERAL), and payment model |
| `Worker` | Individual worker with skill level (HELPER, SKILLED, FOREMAN) and optional custom daily rate |
| `AttendanceLog` | Daily record linking a team to a project sprint |

### 9.2 Payment Models

**Daily Wage Teams:**
- Paid based on attendance: headcount, hours worked, and daily rate.
- Cost formula:

```
Calculated Cost = Workers Present * Daily Rate * (Total Hours / 8)
```

**Example:** 4 workers at Rs. 800/day, working 6 hours:

```
Cost = 4 * 800 * (6 / 8) = 4 * 800 * 0.75 = Rs. 2,400
```

**Contract (Fixed-Price) Teams:**
- Paid on work completion milestones, not daily attendance.
- Attendance is recorded for tracking purposes only, not for billing.
- Example: "False ceiling at Rs. 45/sqft for 1,000 sqft = Rs. 45,000 total"
- Supervisor raises a completion bill at each milestone (e.g., 50% framing complete = Rs. 22,500).

### 9.3 Supervisor Daily Workflow

The Supervisor logs attendance from the mobile-friendly site view:

1. Select the project (e.g., "Villa 402").
2. Select the team (e.g., "Carpentry Team A").
3. Enter headcount (e.g., 4 Skilled, 2 Helpers).
4. Enter hours worked (default: 8).
5. Add notes describing work completed.
6. Upload a mandatory site photo showing the team at work.
7. Submit.

**API:** `POST /labor/attendance`

The system automatically calculates the cost using the team's `default_daily_rate` (or individual worker overrides if set) and creates an `AttendanceLog` with status `PENDING`.

### 9.4 Weekly Payroll Generation

Managers settle labour costs weekly, typically on Saturdays.

**Workflow:**

1. Navigate to `/dashboard/payroll` (or the labour management section).
2. Select the pay period (e.g., "Week of March 16 - March 22").
3. System groups all PENDING attendance logs by team and project.
4. Review the summary:

   | Team | Project | Days | Workers | Total Cost |
   |------|---------|------|---------|------------|
   | Carpentry A | Villa 402 | 6 | 4 avg | 38,400 |
   | Painting B | Apt 501 | 5 | 3 avg | 18,000 |

5. Click "Approve & Generate Payout".
6. For each team-project group, the system:
   a. Checks the **Spending Lock** (does the project wallet have sufficient funds?).
   b. If yes: creates an OUTFLOW transaction (source=LABOR), marks attendance logs as `PAID`.
   c. If no: rejects with "Insufficient Funds" and the logs remain `PENDING`.

### 9.5 Attendance Log Statuses

```
PENDING --> APPROVED_BY_MANAGER --> PAID
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Supervisor submitted; awaiting manager review |
| `APPROVED_BY_MANAGER` | Manager verified the attendance is accurate |
| `PAID` | Payment transaction has been created and linked |

### 9.6 Payroll CSV Export

**API:** `GET /finance/export/payroll?date_from=2026-03-16&date_to=2026-03-22`

Exports all attendance logs for the period with columns: Date, Project, Team, Workers, Hours, Cost, Status.

---

## 10. Budget Management

Beyond the wallet, projects can have detailed budget line items for granular cost tracking.

### 10.1 Budget Categories

| Category | Examples |
|----------|---------|
| `MATERIAL` | Plywood, tiles, hardware, adhesives |
| `LABOR` | Carpentry crew, painting crew, civil crew |
| `SUBCONTRACTOR` | AC installation, modular kitchen vendor |
| `OVERHEAD` | Site supervision, transport, temporary utilities |
| `CONTINGENCY` | Buffer for unforeseen costs (typically 5-10%) |

### 10.2 Budget Line Items

Each line item tracks a budgeted amount for a specific category:

**API:** `POST /finance/projects/{project_id}/budget`

```json
[
  { "category": "MATERIAL", "description": "Plywood and laminates", "budgeted_amount": 250000 },
  { "category": "LABOR", "description": "Carpentry and painting crews", "budgeted_amount": 150000 },
  { "category": "CONTINGENCY", "description": "Buffer", "budgeted_amount": 50000 }
]
```

### 10.3 Budget vs Actual Report

**API:** `GET /finance/projects/{project_id}/budget-vs-actual`

Returns each budget category with:
- Budgeted amount
- Actual spent (from CLEARED OUTFLOW transactions)
- Variance (budgeted - actual)
- Variance percentage

When actual spending exceeds the budget for any category, a variance alert is triggered and sent to Managers.

---

## 11. Reports and Exports

IntDesignERP provides several financial reports accessible to MANAGER and SUPER_ADMIN roles.

### 11.1 Financial Summary

**API:** `GET /finance/summary`

Returns aggregated totals for the organization:

```json
{
  "total_inflow": 2500000.00,
  "total_outflow": 1800000.00,
  "net_balance": 700000.00,
  "pending_inflow": 150000.00,
  "pending_outflow": 200000.00,
  "pending_count": 12,
  "total_count": 156
}
```

**Filters:** `date_from`, `date_to`, `project_id`

### 11.2 Time-Series Aggregation

**API:** `GET /finance/aggregation?group_by=month`

Returns inflow/outflow totals bucketed by day, week, or month:

```json
{
  "group_by": "month",
  "buckets": [
    { "period": "2026-01-01", "inflow": 500000, "outflow": 350000, "net": 150000 },
    { "period": "2026-02-01", "inflow": 600000, "outflow": 420000, "net": 180000 },
    { "period": "2026-03-01", "inflow": 450000, "outflow": 380000, "net": 70000 }
  ]
}
```

Useful for cash flow trend charts (line or bar) in the dashboard.

### 11.3 Source Breakdown

**API:** `GET /finance/breakdown/source`

Returns totals grouped by transaction source:

```json
[
  { "source": "CLIENT", "total_inflow": 2500000, "total_outflow": 0 },
  { "source": "VENDOR", "total_inflow": 0, "total_outflow": 1200000 },
  { "source": "LABOR", "total_inflow": 0, "total_outflow": 450000 },
  { "source": "PETTY_CASH", "total_inflow": 0, "total_outflow": 150000 }
]
```

Useful for pie charts showing expense distribution.

### 11.4 Project Breakdown

**API:** `GET /finance/breakdown/project`

Returns inflow/outflow totals per project, sorted by outflow descending:

```json
[
  {
    "project_id": "abc-123",
    "project_name": "Villa 402",
    "total_inflow": 800000,
    "total_outflow": 650000,
    "net": 150000
  },
  {
    "project_id": "def-456",
    "project_name": "Apt 501",
    "total_inflow": 500000,
    "total_outflow": 420000,
    "net": 80000
  }
]
```

### 11.5 Project Profitability

Derived from the financial health endpoint for each project:

| Metric | Formula |
|--------|---------|
| Gross Margin | `(Agreed Value - Total Spent) / Agreed Value * 100` |
| Collection Rate | `Total Received / Agreed Value * 100` |
| Spend Rate | `Total Spent / Total Received * 100` |
| Burn Indicator | If `Total Spent > Estimated Cost` and project is < 100% complete, flag as loss-making |

**Red Zone Alert:** If the estimated margin drops below the planned margin (typically 30%), the dashboard highlights the project in red. Example:

- Agreed value: 10,00,000
- Estimated cost (70% of agreed): 7,00,000
- Actual spent so far: 6,50,000
- Project completion: 60%
- Projected total cost at current burn rate: 10,83,333 (exceeds agreed value)
- Status: **Red Zone - Loss Making**

### 11.6 CSV Exports

All exports return `StreamingResponse` with `text/csv` content type.

| Export | API Endpoint | Filters |
|--------|-------------|---------|
| Transactions | `GET /finance/export/transactions` | project_id, date_from, date_to |
| Payroll | `GET /finance/export/payroll` | date_from, date_to |
| Inventory | `GET /finance/export/inventory` | (none) |
| Cash Flow | `GET /finance/export/cash-flow` | project_id |

### 11.7 Date Range Filtering

All report and listing endpoints support `date_from` and `date_to` query parameters. The date filter applies to `Transaction.created_at`:

- `date_from`: includes transactions from the start of this day (00:00:00 UTC).
- `date_to`: includes transactions up to the end of this day (23:59:59 UTC).
- Both are optional. Omitting them returns all-time data.

---

## Quick Reference: API Endpoints

| Method | Endpoint | Purpose | Roles |
|--------|----------|---------|-------|
| `GET` | `/finance/projects/{id}/financial-health` | Full financial snapshot | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/projects/{id}/wallet` | Wallet balances | All authenticated |
| `GET` | `/finance/summary` | Org-wide transaction summary | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/aggregation` | Time-bucketed inflow/outflow | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/breakdown/source` | Totals by source | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/breakdown/project` | Totals by project | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/transactions` | List all transactions | All authenticated |
| `POST` | `/finance/transactions` | Record a transaction | SUPER_ADMIN, MANAGER, SALES, SUPERVISOR |
| `PATCH` | `/finance/transactions/{id}/verify` | Verify (PENDING -> CLEARED) | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/projects/{id}/transactions` | Project transactions | All authenticated |
| `POST` | `/finance/projects/{id}/budget` | Create budget line items | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/projects/{id}/budget` | List budget line items | All authenticated |
| `PUT` | `/finance/projects/{id}/budget/{item_id}` | Update budget line item | MANAGER, SUPER_ADMIN |
| `DELETE` | `/finance/projects/{id}/budget/{item_id}` | Delete budget line item | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/projects/{id}/budget-vs-actual` | Budget vs actual report | All authenticated |
| `POST` | `/payments/create-order` | Create Razorpay order | CLIENT, MANAGER, SUPER_ADMIN |
| `POST` | `/payments/verify` | Verify Razorpay payment | CLIENT, MANAGER, SUPER_ADMIN |
| `GET` | `/finance/export/transactions` | Export transactions CSV | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/export/payroll` | Export payroll CSV | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/export/inventory` | Export inventory CSV | MANAGER, SUPER_ADMIN |
| `GET` | `/finance/export/cash-flow` | Export cash flow CSV | MANAGER, SUPER_ADMIN |
