# Inventory, Procurement & Labour Guide

> **Audience:** Admins, Managers, Supervisors, and Procurement staff using Igolo Interior ERP.
> This guide covers the full material lifecycle from stock management through vendor procurement to on-site labour tracking and payroll.

---

## Table of Contents

1. [Inventory Management](#1-inventory-management)
2. [Vendor Management](#2-vendor-management)
3. [Purchase Orders](#3-purchase-orders)
4. [Bill Management](#4-bill-management)
5. [Labour Management](#5-labour-management)
6. [Attendance & Cost Tracking](#6-attendance--cost-tracking)
7. [Weekly Payroll](#7-weekly-payroll)
8. [Contract Labour](#8-contract-labour)
9. [Quick Reference](#9-quick-reference)

---

## 1. Inventory Management

### 1.1 Material Planning Page (`/dashboard/material-planning`)

The Material Planning page is your central hub for monitoring stock levels across all inventory items.

#### Summary Cards

At the top of the page you will find three summary cards:

| Card | Description |
|------|-------------|
| **Total Items** | Total number of distinct materials tracked in the system. |
| **Low Stock Alerts** | Count of items where `current_stock < reorder_level`. These require immediate attention. |
| **Pending Indents** | Material indent requests submitted by Supervisors awaiting Manager approval. |

#### Inventory Table

The main table displays every tracked material with the following columns:

| Column | Description |
|--------|-------------|
| Name | Material name (e.g., "Plywood 18mm BWR") |
| Category | Classification such as Plywood, Tiles, Hardware, Paint, Adhesive |
| Unit | Measurement unit -- sqft, nos, kg, litres |
| Current Stock | Quantity currently available in the warehouse |
| Reorder Level | Minimum threshold; stock below this triggers an alert |
| Rate (Base Price) | Cost price per unit from the last purchase |
| Vendor | Primary supplier linked to this item |
| Status | In Stock, Low Stock (amber), or Out of Stock (red) |

#### Search and Filter

- **Search bar:** Type a material name to filter results instantly. The search is case-insensitive and matches partial names.
- **Category filter:** Select a specific category (Plywood, Tiles, Hardware, etc.) to narrow the list.
- **Status filter:** Toggle "Low Stock Only" to show exclusively items that have fallen below their reorder level.

#### Low Stock Indicators

Items where `current_stock < reorder_level` are flagged with a red badge in the Status column. These rows also appear highlighted so they stand out in the table. The Low Stock Alerts summary card at the top reflects this count.

**Tip:** Review low-stock items at least once daily. Delayed reorders cause project timeline slippages that cascade through all dependent sprints.

#### Create Material Indent

Supervisors working on-site use the Material Indent form to request materials from the warehouse without making purchases themselves.

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| Material | Yes | Select from the inventory item dropdown |
| Quantity | Yes | Number of units needed |
| Project | Yes | The project this material is for |
| Priority | Yes | Normal, High, or Urgent |
| Notes | No | Additional context (e.g., "Need by Thursday for wardrobe framing") |

**Workflow:**

```
Supervisor submits indent
    --> Manager receives notification
    --> Manager approves/rejects
    --> If approved: Warehouse issues stock (current_stock decreases)
    --> StockTransaction(PROJECT_ISSUE) is logged
    --> Cost is booked to the project wallet
```

**Important:** The system checks the project wallet balance before issuing stock. If the project has insufficient funds, the issue is blocked with an "Insufficient Project Funds" error.

#### Reorder Button

Click the "Reorder" button next to any low-stock item to pre-populate a new Purchase Order draft with that item and its preferred vendor. This saves time compared to creating a PO from scratch.

#### Export to CSV

The "Export" button at the top right of the inventory table downloads all currently visible rows (respecting active filters) as a CSV file. Use this for offline review, sharing with stakeholders, or importing into spreadsheet tools.

---

### 1.2 Two Types of Procurement

Igolo Interior ERP distinguishes between two fundamentally different procurement flows. Understanding this distinction is critical because it determines how stock counts and project costs are handled.

#### Type A: General Stock (Warehouse)

**What it is:** Materials bought in bulk and stored in the company warehouse. These are commodity items used across multiple projects.

**Examples:** Cement, adhesives, screws, hinges, sandpaper, primer, general-purpose plywood.

**How it works:**

1. A Purchase Order is created without linking to a specific project (`is_project_specific = false`).
2. When goods are received (GRN), `Item.current_stock` increases by the received quantity.
3. A `StockTransaction(PURCHASE_IN)` record is created for audit trail.
4. Later, when a Supervisor requests material for a project, stock is "issued" -- `current_stock` decreases, and the cost is booked to that project's wallet.

**Financial impact:** The purchase cost sits as company overhead until the stock is issued to a project.

#### Type B: Project-Specific (Direct-to-Site)

**What it is:** Materials purchased for a specific client that never enter the general warehouse. These are typically custom or high-value items.

**Examples:** Designer chandeliers, Italian marble slabs, custom vanity tops, specific-colour laminates chosen by the client.

**How it works:**

1. A Purchase Order is created with `is_project_specific = true` and a `project_id` is mandatory.
2. When goods are received, `Item.current_stock` is NOT affected -- these goods go directly to the project site.
3. Instead, the system immediately creates an OUTFLOW transaction on the project wallet.
4. The project wallet's `total_spent` increases by the PO amount.

**Financial impact:** The cost is booked to the project wallet the moment goods are received. The spending lock applies -- if the project wallet balance is insufficient, the receive action is blocked.

**Key difference at a glance:**

| Aspect | General Stock | Project-Specific |
|--------|--------------|-----------------|
| Warehouse stock affected | Yes (increases on receive) | No |
| Project wallet debited on receive | No | Yes |
| When is project cost incurred | When stock is issued to project | When goods are received |
| `is_project_specific` flag | `false` | `true` |
| `project_id` on PO | Not set | Required |

---

### 1.3 Stock Transaction Log

Every change to stock levels is recorded in an immutable transaction log. This log is the single source of truth for auditing what happened to inventory and when.

**Transaction types:**

| Type | Direction | Description |
|------|-----------|-------------|
| `PURCHASE_IN` | + (positive) | Stock received from a vendor via a General PO |
| `PROJECT_ISSUE` | - (negative) | Stock issued from warehouse to a project site |
| `DAMAGED` | - (negative) | Stock written off due to damage |
| `RETURNED` | + (positive) | Stock returned from site or vendor credit |

**Each transaction records:**

- The inventory item affected
- The quantity (positive for inflows, negative for outflows)
- The unit cost at the time of the transaction (captures the price snapshot)
- A reference ID linking to the PO or Project that triggered the change
- The user who performed the action
- A timestamp

**Tip:** Use the stock transaction history on an item's detail page to investigate discrepancies. If the current stock does not match expectations, the transaction log provides a complete chronological trail of every addition and deduction.

---

## 2. Vendor Management

### 2.1 Vendor List

The vendor directory is accessible from the Admin section. It displays all registered suppliers with their contact details, GST numbers, and the count of purchase orders placed with each.

### 2.2 Creating a Vendor

Click "Add Vendor" to register a new supplier.

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| Vendor Name | Yes | Company or individual name |
| Contact Person | No | Primary point of contact |
| Phone | No | Phone number for orders and inquiries |
| Email | No | Email for PO delivery and communication |
| Address | No | Warehouse/office address |
| GST Number | No | GSTIN for tax invoice reconciliation |

After creation, the vendor appears in the vendor list and becomes available in the Purchase Order vendor dropdown.

### 2.3 Vendor-Item Linking

Each inventory item can be supplied by multiple vendors, and each vendor can supply multiple items. This many-to-many relationship is managed through the "Suppliers" section on an item's detail page.

**To link a vendor to an item:**

1. Navigate to the item's detail page.
2. Under the "Suppliers" section, click "Add Supplier."
3. Select the vendor from the dropdown.
4. Enter the vendor's price for this item.
5. Optionally enter the lead time (in days) for delivery.

This information is used when creating Purchase Orders to show the best-priced supplier and expected delivery timelines.

**Tip:** Always link at least two vendors per high-usage item. This gives you fallback options when a primary vendor is out of stock or delayed.

### 2.4 Vendor Analytics

Each vendor has a performance dashboard showing:

| Metric | Description |
|--------|-------------|
| Total Orders | Count of all POs placed with this vendor (excluding cancelled) |
| Total Spend | Sum of all finalized PO amounts |
| Delivery Rate | Percentage of POs with status RECEIVED out of total orders -- a reliability indicator |
| Status Breakdown | Count of POs by status (Draft, Ordered, Received, Cancelled) |

**How to use:** Compare delivery rates across vendors supplying the same item. A vendor with a 95% delivery rate is more reliable than one at 70%, even if the latter offers a slightly lower price.

---

## 3. Purchase Orders

### 3.1 Purchasing Page (`/dashboard/purchasing`)

The Purchasing page shows all Purchase Orders with filtering and status tracking.

#### PO List

Each row in the PO list displays:

- **PO ID** (shortened UUID for reference)
- **Vendor name**
- **Total amount**
- **Status badge** with colour coding:
  - Draft -- grey
  - Ordered -- blue
  - Received -- green
  - Cancelled -- red
- **Project** (if project-specific, shows project name; otherwise "General Stock")
- **Created date**
- **Created by** (the user who raised the PO)

#### Create PO Form

Click "New Purchase Order" to start a new PO.

**Step 1 -- Header:**

| Field | Required | Description |
|-------|----------|-------------|
| Vendor | Yes | Select from registered vendors |
| Project-Specific | No | Toggle on if buying for a specific project |
| Project | Conditional | Required when Project-Specific is toggled on |
| Notes | No | Internal notes (not sent to vendor) |

**Step 2 -- Line Items:**

For each line item:

| Field | Required | Description |
|-------|----------|-------------|
| Item | Yes | Select from inventory items |
| Quantity | Yes | Number of units to order |
| Unit Price | Yes | Price per unit (auto-populated from vendor-item link if available) |

The system auto-calculates `Total Price = Quantity x Unit Price` for each line and the overall PO total.

**Step 3 -- Review and Save:**

The PO is created in DRAFT status. It can be edited until it moves to ORDERED status.

#### PO Detail View

Click any PO row to expand its detail view showing all line items, quantities, prices, vendor information, and the full audit trail.

#### Project-Specific vs General POs

When the "Project-Specific" toggle is ON:

- The Project dropdown becomes mandatory.
- On receiving, the cost is immediately booked to the project wallet.
- The spending lock is checked -- if the project wallet has insufficient funds, receiving is blocked.

When the toggle is OFF:

- The Project field is disabled.
- On receiving, warehouse stock increases.
- No project wallet is affected until stock is later issued to a project.

#### Export to CSV

The "Export" button downloads all POs matching the current filters as a CSV file.

---

### 3.2 PO Workflow

A Purchase Order progresses through these statuses:

```
DRAFT --> ORDERED --> RECEIVED
  |
  +----> CANCELLED
```

**Status transitions:**

| From | To | Trigger | What Happens |
|------|----|---------|--------------|
| DRAFT | ORDERED | Admin clicks "Send to Vendor" | PO is finalized; can no longer edit line items |
| ORDERED | RECEIVED | Admin clicks "Mark as Received" (GRN) | Stock and financial processing occurs (see below) |
| DRAFT or ORDERED | CANCELLED | Admin clicks "Cancel" | PO is voided; no stock or financial changes |

#### When Goods Are Received (GRN Processing)

**For a General PO (`is_project_specific = false`):**

1. Each line item's quantity is added to `Item.current_stock`.
2. A `StockTransaction(PURCHASE_IN)` is created per item with the unit cost captured at that moment.
3. Managers are notified that a PO has been received.

**For a Project-Specific PO (`is_project_specific = true`):**

1. `Item.current_stock` is NOT changed.
2. The spending lock is checked: `effective_balance = total_received - (total_spent + pending_approvals)`. If `effective_balance < PO total`, the receive action is rejected.
3. An OUTFLOW transaction of type VENDOR is created on the project wallet.
4. `ProjectWallet.total_spent` is increased by the PO total amount.
5. Managers are notified.

**Tip:** Always verify the physical goods against the PO line items before clicking "Mark as Received." Once received, stock changes and financial transactions are committed and cannot be undone through the UI.

---

## 4. Bill Management

### 4.1 Overview

Vendors send invoices (bills) after delivering goods. The bill amount may differ from the PO amount due to price changes, partial deliveries, or additional charges. The Bill Management module handles reconciliation.

### 4.2 Vendor Bill Lifecycle

```
RECEIVED --> VERIFIED --> APPROVED --> PAID
     |
     +----> DISPUTED
```

| Status | Meaning |
|--------|---------|
| RECEIVED | Bill has been entered into the system |
| VERIFIED | Finance team has checked the bill against the PO |
| APPROVED | Manager has approved the bill for payment |
| PAID | Payment has been processed to the vendor |
| DISPUTED | A discrepancy was found; bill is on hold |

### 4.3 Creating a Vendor Bill

**Form fields:**

| Field | Required | Description |
|-------|----------|-------------|
| Vendor | Yes | The vendor who sent the bill |
| Purchase Order | No | Link to the original PO (for reconciliation) |
| Bill Number | Yes | The vendor's invoice number |
| Bill Date | Yes | Date on the vendor's invoice |
| Amount | Yes | Pre-tax amount |
| Tax Amount | Yes | GST/tax component |
| Total Amount | Yes | Final payable amount including tax |
| Notes | No | Any remarks about the bill |

### 4.4 Price Variance Detection

When a vendor bill is linked to a PO, the system compares the billed price per item against the PO price.

**If the variance exceeds 10%:**

- A "Price Alert" notification is sent to Managers.
- The bill is flagged for review before it can move to APPROVED status.

**Example:**

- PO listed Plywood 18mm at Rs. 100/sqft.
- Vendor bill shows Rs. 115/sqft (15% increase).
- The system flags this as a significant variance and alerts the Manager.

### 4.5 Inventory Price Auto-Update

When a vendor bill is verified and the actual price differs from the recorded base price of the item:

- The item's `base_price` is updated to reflect the latest purchase cost.
- This ensures future quotations use accurate, up-to-date pricing.

**Tip:** Regularly review items whose base price has changed significantly. Quotations created before the price update will still use the old price (prices are snapshot at quotation time), but new quotations will automatically pick up the updated cost.

---

## 5. Labour Management

### 5.1 Labour Page (`/dashboard/labour`)

The Labour page is divided into two tabs: **Labour Directory** and **Attendance & Cost**.

---

### 5.2 Labour Directory Tab

#### Worker Table

Displays all registered workers with:

| Column | Description |
|--------|-------------|
| Name | Worker's full name |
| Trade | Team specialization (Civil, Carpentry, Painting, Electrical, Plumbing, General) |
| Phone | Contact number |
| Daily Rate | Individual daily wage (overrides team default if set) |
| Skill Level | HELPER, SKILLED, or FOREMAN |
| Status | Active or inactive |
| Assigned Project | Current project assignment, if any |

#### Add Worker Form

Workers are added to a specific Labour Team.

| Field | Required | Description |
|-------|----------|-------------|
| Name | Yes | Worker's full name |
| Team | Yes | The labour team this worker belongs to |
| Skill Level | Yes | HELPER (Rs. 500-600/day), SKILLED (Rs. 700-900/day), or FOREMAN (Rs. 1000+/day) |
| Daily Rate | No | Individual rate override; if blank, the team's default daily rate applies |
| Phone | No | Contact number |

#### Search and Filter

- **By trade:** Filter workers by their team's specialization (e.g., show only Carpenters).
- **By project:** Filter to show only workers assigned to a specific project.
- **Search:** Type a name to find a specific worker.

---

### 5.3 Labour Teams

Labour teams are the organizational unit for grouping workers by trade and billing arrangement.

#### Team Specializations

| Specialization | Typical Work |
|---------------|--------------|
| CIVIL | Wall breaking, demolition, flooring base, masonry |
| CARPENTRY | Wardrobes, kitchen cabinets, false ceiling framing |
| PAINTING | Wall prep, primer, paint coats, texture finishes |
| ELECTRICAL | Wiring, switch boards, light fittings, AC points |
| PLUMBING | Piping, tap installation, drainage, water heaters |
| GENERAL | Cleaning, transport, helper work, miscellaneous |

#### Payment Models

Each team operates under one of two payment models:

**Daily Wage:**

- Workers are paid based on attendance (days worked, hours logged).
- Cost formula: `workers_present x daily_rate x (total_hours / 8)`
- Payment is processed weekly through the payroll approval workflow.

**Contract Fixed:**

- The team is paid a fixed amount for completing a defined scope of work (e.g., Rs. 45/sqft for false ceiling installation across 1000 sqft = Rs. 45,000 total).
- Payments are milestone-based, not attendance-based.
- Attendance is still logged for record-keeping but is NOT used for billing.

#### Creating a Labour Team

| Field | Required | Description |
|-------|----------|-------------|
| Team Name | Yes | Descriptive name (e.g., "Roy's Painting Crew") |
| Leader Name | Yes | Name of the team lead / contractor |
| Contact Number | No | Team lead's phone |
| Specialization | Yes | Select from the six categories above |
| Payment Model | Yes | Daily Wage or Contract Fixed |
| Default Daily Rate | Yes | Per-worker daily rate for the team |
| Supervisor | No | Internal supervisor overseeing this team |

---

## 6. Attendance & Cost Tracking

### 6.1 Attendance & Cost Tab

The second tab on the Labour page displays attendance records.

#### Attendance Table

| Column | Description |
|--------|-------------|
| Date | The date of the attendance entry |
| Team | Labour team name |
| Workers Present | Number of workers on site that day |
| Hours | Total hours worked |
| Calculated Cost | Auto-computed cost for the day |
| Notes | Supervisor's remarks about work done |
| Status | PENDING, APPROVED_BY_MANAGER, or PAID |

#### Mark Attendance Form

Supervisors use this form daily to record on-site labour activity.

| Field | Required | Description |
|-------|----------|-------------|
| Project | Yes | Select the active project |
| Sprint | Yes | Current sprint (links cost to the correct project phase) |
| Team | Yes | The labour team working that day |
| Date | Yes | Defaults to today |
| Workers Present | Yes | Headcount on site |
| Total Hours | Yes | Hours worked (defaults to 8) |
| Site Photo | Recommended | Upload a photo of the team on site (helps prevent ghost labour) |
| Notes | No | Description of work completed |

#### Cost Auto-Calculation

The system automatically calculates the cost when attendance is logged:

```
calculated_cost = workers_present x team.default_daily_rate x (total_hours / 8)
```

**Example:**

- Team: Roy's Painting Crew
- Default daily rate: Rs. 800/worker
- Workers present: 4
- Hours worked: 8

```
Cost = 4 x 800 x (8/8) = Rs. 3,200
```

**Half-day example:**

- Same team, but only 4 hours worked:

```
Cost = 4 x 800 x (4/8) = Rs. 1,600
```

---

### 6.2 Attendance Status Workflow

```
PENDING --> APPROVED_BY_MANAGER --> PAID
```

| Status | Meaning | Who acts |
|--------|---------|----------|
| PENDING | Supervisor has logged attendance; awaiting review | Supervisor submits |
| APPROVED_BY_MANAGER | Manager has verified and approved for payment | Manager approves |
| PAID | Payment has been processed and debited from project wallet | System marks after payroll |

### 6.3 Supervisor's Daily Workflow

The recommended daily workflow for on-site Supervisors:

1. **Morning:** Confirm which workers have arrived. Take a site photo showing the team.
2. **End of day:** Open the Labour page on the mobile view.
3. **Log attendance:** Select the project, select the sprint, choose the team, enter headcount and hours.
4. **Upload site photo:** Attach the morning photo as proof of attendance.
5. **Add notes:** Describe what was accomplished (e.g., "Completed wardrobe carcass in Master Bedroom. Started laminate in kids room.").
6. **Submit.** The attendance log is created with status PENDING.

**Tip:** Log attendance the same day. Backdating entries raises audit flags and delays payroll processing.

---

## 7. Weekly Payroll

### 7.1 Manager's Payroll Dashboard

Managers process payroll weekly, typically on Saturdays.

**Location:** Accessible from the Labour page or the Admin payroll section.

### 7.2 Payroll Approval Workflow

**Step 1 -- Select the week:**

Choose the date range (e.g., Mon 10 Feb -- Sat 15 Feb).

**Step 2 -- Review grouped entries:**

The system groups all PENDING attendance logs by team AND by project. Each entry shows:

- Team name and specialization
- Project name
- Days worked in the selected week
- Average workers per day
- Total hours
- Calculated cost for the period
- Status (PENDING, partially approved, etc.)

**Example display:**

```
Roy's Painting Crew (Painting) -- Villa 402
  Days: 6 | Workers: 4 avg | Hours: 48 | Cost: Rs. 38,400
  Status: PENDING
  [Approve]

Sharma Carpentry (Carpentry) -- Villa 402
  Days: 5 | Workers: 3 avg | Hours: 40 | Cost: Rs. 24,000
  Status: PENDING
  [Approve]
```

**Step 3 -- Approve:**

Click "Approve" on each entry (or approve in batch). This triggers the following:

1. **Spending lock check:** The system verifies the project wallet has sufficient funds. The formula used is:
   ```
   effective_balance = total_received - (total_spent + pending_approvals)
   ```
   If `effective_balance < payroll amount`, approval is rejected with an "Insufficient Project Funds" error.

2. **Status update:** All attendance logs in the batch are marked as `APPROVED_BY_MANAGER`.

3. **Financial transaction:** A single OUTFLOW transaction of type LABOR is created on the project wallet, consolidating the entire batch amount.

4. **Wallet update:** `ProjectWallet.total_spent` increases by the approved amount.

5. **Notification:** Managers receive confirmation that the payroll has been processed.

**Step 4 -- Payout:**

Once approved, the actual bank transfer or cash payout is handled offline. The system records the financial impact but does not initiate bank transfers.

### 7.3 Important Rules

- All attendance logs in a single approval batch must belong to the **same project**. Cross-project batch approvals are not permitted.
- Only logs with PENDING status can be approved. Already-approved or paid logs are skipped.
- The spending lock is non-negotiable. If a project has insufficient funds, the Manager must request a client top-up before approving payroll.

**Tip:** Review attendance logs throughout the week rather than waiting until Saturday. This catches data entry errors early and gives you time to request client top-ups if the wallet is running low.

---

## 8. Contract Labour

### 8.1 How Contract Labour Differs

Contract labour teams are paid a fixed amount for completing a defined scope, not based on daily attendance.

**Example contract:**

- **Scope:** False ceiling installation
- **Rate:** Rs. 45/sqft
- **Area:** 1,000 sqft
- **Total contract value:** Rs. 45,000
- **Milestones:**
  - 50% on framing completion = Rs. 22,500
  - 50% on finishing and handover = Rs. 22,500

### 8.2 Contract Billing Workflow

```
Contract agreed
    --> Work in progress (attendance logged for records)
    --> Milestone reached (e.g., "Framing Complete")
    --> Supervisor raises milestone bill
    --> Manager verifies on site
    --> Manager approves payment
    --> Project wallet debited (same spending lock applies)
```

### 8.3 Attendance for Contract Teams

Even for contract-based teams, Supervisors should log daily attendance. This serves important purposes:

- **Progress tracking:** Correlate days worked with milestone progress.
- **Dispute resolution:** If a contractor claims they worked 20 days but records show 12, the attendance log is evidence.
- **Performance analytics:** Enables the system to calculate cost-per-sqft and time efficiency metrics.

However, the `calculated_cost` in attendance logs for contract teams is informational only -- it is NOT used for actual billing. Payment is based on milestone completion.

### 8.4 Performance Analytics

The system tracks team productivity metrics:

| Metric | Description |
|--------|-------------|
| Total Logs | Number of attendance entries for the team |
| Total Hours | Cumulative hours worked across all projects |
| Total Cost | Cumulative calculated cost |
| Total Worker-Days | Sum of workers_present across all logs |
| Avg Daily Cost | Average cost per attendance entry |
| Project Breakdown | Per-project split of days worked, cost, and hours |

**Practical use:** Compare two carpentry teams:

- Team A: 15 days for a kitchen, Rs. 500/day per worker, 3 workers = Rs. 22,500
- Team B: 10 days for a kitchen, Rs. 800/day per worker, 3 workers = Rs. 24,000

Team B costs slightly more but finishes 5 days faster, which may be worth it for time-sensitive projects.

---

## 9. Quick Reference

### Role Permissions Summary

| Action | Super Admin | Manager | Supervisor | Sales |
|--------|:-----------:|:-------:|:----------:|:-----:|
| View inventory | Yes | Yes | Read-only | No |
| Create/edit items | Yes | Yes | No | No |
| Create vendor | Yes | Yes | No | No |
| Create PO | Yes | Yes | No | No |
| Receive PO (GRN) | Yes | Yes | No | No |
| Submit material indent | No | No | Yes | No |
| Approve material indent | Yes | Yes | No | No |
| Add labour team/worker | Yes | Yes | No | No |
| Log attendance | No | Yes | Yes | No |
| Approve payroll | Yes | Yes | No | No |

### Stock Transaction Types

| Type | Stock Effect | Wallet Effect |
|------|:------------|:-------------|
| PURCHASE_IN | +quantity | None (General) or Debit (Project-Specific) |
| PROJECT_ISSUE | -quantity | Debit project wallet |
| DAMAGED | -quantity | None |
| RETURNED | +quantity | None |

### PO Status Flow

```
DRAFT -----> ORDERED -----> RECEIVED
  |
  +--------> CANCELLED
```

### Attendance Status Flow

```
PENDING -----> APPROVED_BY_MANAGER -----> PAID
```

### Vendor Bill Status Flow

```
RECEIVED --> VERIFIED --> APPROVED --> PAID
                |
                +--> DISPUTED
```

### Key Formulas

**Labour cost calculation:**

```
calculated_cost = workers_present x daily_rate x (total_hours / 8)
```

**Project wallet effective balance (spending lock):**

```
effective_balance = total_received - (total_spent + pending_approvals)
```

**Spending lock rule:** Any expense (material purchase, stock issue, or payroll) is blocked if the expense amount exceeds the effective balance.

---

### Common Scenarios

**Scenario: Stock running low on plywood**

1. Check the Material Planning page -- Plywood 18mm shows a red "Low Stock" badge.
2. Click "Reorder" to create a draft PO pre-populated with the item and preferred vendor.
3. Add the desired quantity, review the unit price, and save.
4. Move the PO to ORDERED status to send it to the vendor.
5. When goods arrive, click "Mark as Received" to update warehouse stock.

**Scenario: Supervisor needs marble for a specific project**

1. Supervisor submits a Material Indent specifying the project, the marble type, and quantity.
2. Manager reviews and approves the indent.
3. Admin creates a project-specific PO (toggle "Project-Specific" ON, select the project).
4. When marble arrives at site, Admin marks the PO as received.
5. The project wallet is debited automatically. No warehouse stock changes.

**Scenario: Weekly payroll shows insufficient funds**

1. Manager opens the payroll dashboard for the current week.
2. Clicks "Approve" on the carpentry team entry (Rs. 24,000).
3. System rejects: "Insufficient Project Funds. Effective balance: Rs. 18,000. Required: Rs. 24,000."
4. Manager contacts the client to request a top-up of at least Rs. 6,000.
5. Client pays via the Client Portal or bank transfer.
6. Finance verifies the payment, crediting the project wallet.
7. Manager retries the payroll approval -- this time it succeeds.

**Scenario: Vendor bill price differs from PO**

1. Vendor delivers tiles and sends an invoice at Rs. 115/sqft instead of the PO price of Rs. 100/sqft.
2. Finance enters the vendor bill linking it to the original PO.
3. System detects a 15% variance (above the 10% threshold) and sends a Price Alert to Managers.
4. Manager reviews and decides whether to accept, negotiate, or dispute.
5. If accepted: the item's base price is updated to Rs. 115/sqft for future quotations.
6. Bill moves to VERIFIED, then APPROVED, then PAID.
