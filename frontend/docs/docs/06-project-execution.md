# Project Execution Guide

This guide covers the complete project execution lifecycle in Igolo Interior ERP -- from converting an approved quotation into a live project, through sprint-based execution tracking, to final handover.

---

## Table of Contents

1. [Project Conversion](#project-conversion)
2. [The 6 Standard Sprints](#the-6-standard-sprints)
3. [Projects Page](#projects-page)
4. [Project Detail Page](#project-detail-page)
5. [Execution Tracking Page](#execution-tracking-page)
6. [Daily Logs](#daily-logs)
7. [Variation Orders](#variation-orders)

---

## Project Conversion

### The Full Pipeline: Lead to Project

A project in Igolo Interior ERP follows a strict pipeline before execution begins:

```
Lead --> Quotation --> Approve --> Convert to Client --> Convert to Project
```

Each step must be completed in sequence. You cannot skip stages.

#### Step 1: Lead Captured

A BDE or Sales user creates a lead with client contact details, source (Website, Referral, etc.), and initial notes. The lead begins in **NEW** status.

#### Step 2: Quotation Created and Approved

The Sales team builds a quotation against the lead using the Quotation Builder. The quotation moves through these statuses:

| Status | Description |
|--------|-------------|
| DRAFT | Being prepared, rooms and items being added |
| SENT | Shared with the client for review |
| APPROVED | Client has accepted the quotation |
| REJECTED | Client declined |
| ARCHIVED | Converted to a project (locked from further edits) |

Only a quotation in **APPROVED** status can be converted to a project.

#### Step 3: Convert Lead to Client

Before project conversion, the lead must be converted to a Client record. This step:

- Creates a **Client** record linked to the original lead.
- Creates a **User** account with the **CLIENT** role, giving the client login access to the Client Portal.
- The client receives login credentials via email.

If no Client record exists for the lead, the conversion will fail with the error: *"No client record found for this lead. Convert the lead to a client first."*

#### Step 4: Convert Quotation to Project

This is the "Big Bang" moment. A Manager or Super Admin triggers the conversion from the quotation detail page.

**Required inputs:**

| Field | Description |
|-------|-------------|
| Project Name | Descriptive name (e.g., "Villa 402 - Complete Interior") |
| Start Date | When site work begins |
| Manager | Assigned project manager (from staff) |
| Supervisor | Assigned site supervisor (from staff) |
| Site Address | Physical location of the project |

**What happens during conversion:**

1. **Project record created** -- Linked to the client and the accepted quotation. Status is set to NOT_STARTED. The total project value is copied from the quotation total amount.

2. **6 standard sprints auto-generated** -- Each sprint is created with calculated start and end dates, linked sequentially via dependencies. The project's expected end date is set to the last sprint's end date. (See [The 6 Standard Sprints](#the-6-standard-sprints) for details.)

3. **Project Wallet initialized** -- A financial wallet is created with:
   - `total_agreed_value` = quotation total amount
   - `total_received` = 0.00
   - `total_spent` = 0.00
   - `pending_approvals` = 0.00

4. **Quotation archived** -- The source quotation status changes to ARCHIVED, preventing it from being converted again or edited.

5. **Lead status updated** -- The associated lead is marked as CONVERTED.

6. **Notifications sent:**
   - **Client** receives an email notification that their project has started, with the project name, start date, and expected end date.
   - **Manager** receives an in-app notification and email about their new project assignment.
   - **Supervisor** receives an in-app notification and email about their new project assignment.

> **Tip:** A quotation can only be converted once. If you attempt to convert an already-converted quotation, the system will reject it with the message: *"A project already exists for this quotation."*

> **Access Control:** Only users with the **MANAGER** or **SUPER_ADMIN** role can perform project conversion.

---

## The 6 Standard Sprints

Every project in Igolo Interior ERP follows a standardized 6-phase execution model. These sprints are auto-generated when a project is created and represent the industry-standard interior design workflow.

### Sprint Overview

| Sprint | Name | Default Duration | Key Activities |
|--------|------|-----------------|----------------|
| 1 | Design & Approvals | 10 days | 2D/3D layouts, material selection, client sign-off on design |
| 2 | Civil & Demolition | 15 days | Wall breaking, debris removal, flooring base preparation |
| 3 | MEP (Mech, Elec, Plumb) | 10 days | Electrical wiring, plumbing piping, AC duct installation |
| 4 | Woodwork & Carpentry | 25 days | Wardrobes, kitchen cabinets, false ceiling framing |
| 5 | Finishing & Painting | 12 days | Laminates, paint coats, electrical fittings, hardware |
| 6 | Handover & Snag List | 5 days | Deep cleaning, final inspection, snag resolution, key handover |

**Total default duration: 77 days** (plus gaps between sprints).

### Sprint Dependencies

Each sprint depends on the one before it:

```
Sprint 1 (Design)
  └── Sprint 2 (Civil)
        └── Sprint 3 (MEP)
              └── Sprint 4 (Carpentry)
                    └── Sprint 5 (Finishing)
                          └── Sprint 6 (Handover)
```

Sprint 1 has no dependency (it starts on the project start date). Sprint 2 starts the day after Sprint 1 ends, and so on.

### Date Auto-Calculation

When a project starts on, say, March 1:

| Sprint | Start Date | End Date |
|--------|-----------|----------|
| 1 - Design & Approvals | Mar 1 | Mar 11 |
| 2 - Civil & Demolition | Mar 12 | Mar 27 |
| 3 - MEP | Mar 28 | Apr 7 |
| 4 - Woodwork & Carpentry | Apr 8 | May 3 |
| 5 - Finishing & Painting | May 4 | May 16 |
| 6 - Handover & Snag List | May 17 | May 22 |

### Cascading Date Updates (Ripple Effect)

If a sprint's end date changes (e.g., Sprint 2 is extended by 5 days due to site conditions), the system automatically cascades the delay to all subsequent sprints:

1. The delay delta is calculated: `new_end_date - old_end_date`.
2. All sprints that depend on the changed sprint have their start and end dates shifted by the same delta.
3. The cascade continues recursively through the dependency chain.

**Example:** If Sprint 2 end date moves from Mar 27 to Apr 1 (5-day delay):
- Sprint 3 shifts from Mar 28-Apr 7 to Apr 2-Apr 12
- Sprint 4 shifts from Apr 8-May 3 to Apr 13-May 8
- Sprint 5 shifts from May 4-May 16 to May 9-May 21
- Sprint 6 shifts from May 17-May 22 to May 22-May 27
- Project expected end date updates accordingly

> **Tip:** Only Managers and Super Admins can modify sprint dates. Always communicate date changes to the client promptly, as the Gantt chart in the Client Portal updates in real time.

### Sprint Statuses

| Status | Meaning | Visual Indicator |
|--------|---------|-----------------|
| PENDING | Not yet started, waiting for predecessor | Gray circle, "Upcoming" badge |
| ACTIVE | Currently in progress | Blue clock icon, "In Progress" badge with progress bar |
| COMPLETED | All work finished | Green checkmark, "Completed" badge |
| DELAYED | Behind schedule | Red badge, "Delayed" indicator |

Sprints move through these statuses as work progresses. The completion percentage (0-100%) can be updated independently of the status to show granular progress within an active sprint.

---

## Projects Page

**Route:** `/dashboard/projects`

**Access:** SUPER_ADMIN, MANAGER, SUPERVISOR

The Projects page is the central hub for managing all active and past projects.

### Page Layout

The page displays a data table with the following columns:

| Column | Description |
|--------|-------------|
| Project | Client name + project reference code (PRJ-XXXXXXXX) |
| Client | Client's full name |
| Status | Color-coded status badge (Not Started / In Progress / On Hold / Completed). Shows a red "Overdue" badge if the expected end date has passed and the project is not completed. |
| Start Date | Formatted as DD Mon YYYY (e.g., "15 Mar 2026") |
| Value | Total project value in currency format |
| Received / Spent | Green text for amount received, red text for amount spent |
| Actions | "View" button linking to the project detail page |

### Search and Filtering

- **Search bar:** Free-text search across all project data (client name, project reference, etc.).
- **Status filter dropdown:** Filter by All Statuses, Not Started, In Progress, On Hold, or Completed.
- **Pagination:** 10 projects per page with previous/next navigation.

### Empty State

If no projects exist yet, the page displays a message: *"No projects found. Projects are created when a quotation is converted."*

---

## Project Detail Page

**Route:** `/dashboard/projects/[id]`

**Access:** SUPER_ADMIN, MANAGER, SUPERVISOR

The project detail page is organized into tabs, each focusing on a different aspect of project management.

### Overview Tab

The Overview tab provides a high-level snapshot of the project's health.

**Overdue Warning:** If the project's expected end date has passed and the project is not marked COMPLETED, a red warning banner appears at the top: *"This project is overdue. Expected completion was [date]."*

**Summary Cards (4-column grid):**

| Card | Shows |
|------|-------|
| Project Value | Total agreed project value |
| Balance | Received minus Spent (green if positive, red if negative) |
| Sprint Progress | X of 6 sprints completed, with percentage |
| Timeline | Start date and expected end date |

**Cost Breakdown:** The overview calculates expenses by category from transaction records:
- **Labor Cost** -- Sum of all OUTFLOW transactions with LABOR source
- **Material Cost** -- Sum of all OUTFLOW transactions with VENDOR source
- **Other Costs** -- Sum of remaining OUTFLOW transactions (petty cash, miscellaneous)

**Cover Image:** Managers can upload a project cover image (e.g., a 3D render or site photo) to visually identify the project.

### Sprints Tab

The Sprints tab offers two view modes, toggled via view selector buttons:

#### Gantt Chart View (Bar Chart)

A horizontal bar chart powered by Recharts showing all 6 sprints as bars:
- **X-axis:** Sprint names (sorted by sequence order)
- **Y-axis:** Duration in days
- **Color coding by status:**
  - Gray for PENDING sprints
  - Blue for ACTIVE sprints
  - Green for COMPLETED sprints
  - Red for DELAYED sprints
- Hovering over a bar shows the sprint name and duration in days

#### List View (Sprint Cards)

Each sprint is displayed as a card showing:
- Sprint name and sequence number
- Status badge (Pending / Active / Completed / Delayed)
- Date range (start to end date)
- Notes (if any)

**For ACTIVE sprints, additional controls appear:**

- **Progress Slider:** A slider control (0-100%) that allows Managers to update the sprint's completion percentage. Drag to the desired percentage and the value saves automatically.
- **Progress Bar:** Visual representation of the completion percentage as a filled bar.

**Sprint Status Updates:**
- Managers can change a sprint's status through the sprint update dialog.
- Changing dates triggers the Ripple Date Update to cascade changes to dependent sprints.
- A sprint's `completion_percentage` must be between 0 and 100. Invalid values are rejected.
- Sprint end date cannot be set before the start date.

### Finance Tab

The Finance tab provides full financial visibility for the project.

**Wallet Summary Cards:**
- Total Agreed Value (original quote + approved VOs)
- Total Received (client payments cleared)
- Total Spent (all approved expenses)
- Current Balance (received - spent)
- Pending Approvals (expenses awaiting clearance)

**Record Payment Dialog:** Managers can record new transactions with:
- Amount (required, must be positive)
- Description (required)
- Source: CLIENT, VENDOR, LABOR, or PETTY_CASH
- Category: INFLOW (money in) or OUTFLOW (money out)

> **Important:** OUTFLOW transactions are subject to the **Spending Lock**. If the project wallet balance (received - spent - pending) is insufficient, the transaction is rejected with a 402 error: *"Project funds exhausted. Request Top-up from Client."*

**Transaction History Table:**
All transactions are listed chronologically (newest first) with amount, description, source, category, and status.

### Daily Logs Tab

Displays a chronological feed of daily progress logs. See [Daily Logs](#daily-logs) for details on creating and managing logs.

### Variation Orders Tab

Lists all variation orders for the project with their status, cost, and linked sprint. See [Variation Orders](#variation-orders) for the full workflow.

### Labor Tab

Shows labor attendance records linked to the project, including team assignments, headcount, hours, and calculated costs. Labor logs are grouped by sprint for cost attribution.

### Materials Tab

Displays all materials linked to the project:
- **Purchase Orders** -- Project-specific POs with their items and delivery status
- **Stock Issues** -- General stock items issued from the warehouse to this project

---

## Execution Tracking Page

**Route:** `/dashboard/execution-tracking`

**Access:** SUPER_ADMIN, MANAGER, SUPERVISOR

The Execution Tracking page provides a bird's-eye view of all active projects and their sprint progress, designed for daily operational use by managers and supervisors.

### Summary Cards

Four cards at the top provide real-time statistics across all projects:

| Card | Metric | Description |
|------|--------|-------------|
| Active Sites | Count | Number of projects with IN_PROGRESS status |
| Sprints Completed | X of Y | Total completed sprints across all projects vs. total sprints |
| On-Schedule | Count | Projects where no sprint is marked as DELAYED |
| Delayed | Count | Projects that have at least one DELAYED sprint |

### Project Selector

A row of tab-like buttons allows switching between projects. The currently selected project is highlighted. Up to 20 projects are loaded.

### Sprint / Phase Timeline

For the selected project, a vertical timeline displays all 6 sprints in sequence order:

- **Vertical connector line** between sprints (green if the previous sprint is completed, gray otherwise)
- **Status icon:** Green checkmark (completed), blue clock (active), gray circle (pending)
- **Sprint name** with status badge
- **Date range** formatted as "DD Mon - DD Mon"
- **Progress bar** (visible only for ACTIVE sprints) showing the completion percentage with a blue fill bar

### Today's Activities

A panel showing daily logs recorded today for the selected project. If no logs exist for the current date, it displays: *"No activities logged today."*

### Site Issues

A panel for tracking blockers and issues reported through daily logs. Shows open issues that need attention.

### Add Daily Log

Click the **"+ Add Daily Log"** button in the top-right to open an inline form:

| Field | Type | Description |
|-------|------|-------------|
| Sprint | Dropdown | Select which sprint this log applies to |
| Description | Text | What was completed today (required) |
| Progress % | Number (0-100) | Current completion percentage |
| Photo Notes | Text | References to photos or additional notes |

Click **"Save Log"** to submit. The log is created via `POST /projects/{id}/daily-logs` and linked to the selected sprint.

### Export Report

Click **"Export Report"** to download a CSV file containing the selected project's sprint data:
- Sprint name, status, start date, end date, and completion percentage
- File is named `{project-name}-report.csv`

---

## Daily Logs

Daily logs are the primary mechanism for supervisors and managers to record on-site progress. They replace informal WhatsApp updates with structured, auditable records.

### Creating a Daily Log

Daily logs can be created from two locations:
1. **Project Detail Page** (Daily Logs tab) -- for focused, project-specific logging
2. **Execution Tracking Page** -- for quick logging across projects

**Required fields:**

| Field | Description |
|-------|-------------|
| Sprint | Which sprint/phase this work belongs to (dropdown from project sprints) |
| Date | The date of the work (defaults to today) |
| Notes | Description of work completed, observations, and progress details |

**Optional fields:**

| Field | Description |
|-------|-------------|
| Blockers | Any issues preventing progress (e.g., "Material shortage", "Client changed design") |
| Image URLs | Up to 5 photo uploads showing site progress (uploaded via the file upload component) |
| Visible to Client | Toggle (on/off) controlling whether the client can see this log in their portal |

### Photo Uploads

- Supervisors can attach up to 5 photos per daily log entry.
- Photos are uploaded via the multi-file upload component and stored as URL references.
- Common photos include: completed work areas, material deliveries, site conditions, and team at work.

### Visibility Control

The **"Visible to Client"** toggle is a critical feature:

- **ON (default: OFF):** The log entry appears in the Client Portal, keeping the client informed of progress.
- **OFF:** The log is internal only. Use this for entries containing sensitive information such as:
  - Worker accidents or damage
  - Internal team issues
  - Rework or quality problems
  - Cost overruns or delays being managed internally

> **Tip:** Managers can review all daily logs and selectively toggle visibility before the client sees them. This allows the team to maintain transparency while controlling the narrative around sensitive situations.

### Viewing Daily Logs

Daily logs are displayed as a reverse-chronological feed (newest first). Each log entry shows:
- Date and sprint name
- Who logged the entry
- Notes and blockers
- Attached photos (clickable thumbnails)
- Visibility indicator

**Filtering options:**
- Filter by sprint (to see all logs for a specific phase)
- Filter by visibility (client-visible only, or all logs)
- Pagination (50 entries per page)

### How Logs Appear in the Client Portal

Clients accessing their portal see only logs marked as "Visible to Client." The view is a simplified, mobile-friendly feed showing:
- Date
- Sprint/phase name
- Progress notes
- Photos

Clients cannot see blockers, internal notes, or logs with visibility turned off.

---

## Variation Orders

### What is a Variation Order (VO)?

A Variation Order handles any changes to the project scope **after the original contract (quotation) has been signed and converted**. Common examples:

- Client requests an additional wardrobe in the guest room
- Design changes requiring different (more expensive) materials
- Adding a false ceiling that was not in the original scope
- Upgrading kitchen countertop material

VOs are the formal mechanism for scope changes that affect cost and potentially the timeline.

### VO Statuses

| Status | Meaning |
|--------|---------|
| REQUESTED | VO has been submitted, awaiting manager review |
| APPROVED | Manager has approved the scope change |
| REJECTED | Manager has declined the request |
| PAID | Client has paid for the additional work |

### Creating a Variation Order

Any authenticated user can create a VO from the project detail page (Variation Orders tab):

1. Click **"+ New Variation Order"**
2. Fill in the form:
   - **Description** (required): Detailed explanation of the additional work
   - **Additional Cost** (required): The cost of the extra work
   - **Linked Sprint** (optional): Which sprint this work falls under
   - **Supporting Document** (optional): Upload a document or image supporting the request
3. Click **Submit**

The VO is created in **REQUESTED** status. All Managers are notified via in-app notification and email.

### VO Approval Workflow

```
REQUESTED --> Manager Reviews --> APPROVED or REJECTED
                                       |
                                  (if approved)
                                       |
                               Client Pays --> PAID
                                       |
                              Work Can Begin
```

1. **Request:** Any team member can submit a VO. Managers receive a notification with the VO details and cost.

2. **Review:** A Manager or Super Admin reviews the VO on the project detail page. They can:
   - **Approve** -- The VO is valid and the work should proceed once paid.
   - **Reject** -- The VO is declined with a reason.

3. **Payment:** The client must pay the additional cost. Once payment is confirmed, the VO status moves to PAID.

4. **Execution:** Work on the VO can only begin after payment is received. This is a strict rule enforced by the system.

> **Access Control:** Only **MANAGER** and **SUPER_ADMIN** roles can approve, reject, or mark VOs as paid.

### Financial Impact

When a VO status changes to **PAID**, the system automatically updates the Project Wallet:

- `total_agreed_value` increases by the VO's additional cost
- `total_received` increases by the VO's additional cost

This means the manager now has additional spending power equal to the VO amount. The Spending Lock recalculates based on the updated wallet.

**Example:**
- Original project value: Rs. 10,00,000
- VO for extra wardrobe: Rs. 50,000
- After VO is PAID:
  - Total agreed value: Rs. 10,50,000
  - Total received increases by Rs. 50,000
  - Manager can now spend the additional Rs. 50,000 on materials and labor for the wardrobe

### Timeline Impact

If a VO adds significant work, it may affect the project schedule:

1. The VO should be **linked to a sprint** when created (e.g., linking an extra wardrobe VO to Sprint 4: Woodwork & Carpentry).
2. The Manager may need to **extend the linked sprint's end date** to accommodate the extra work.
3. Extending a sprint triggers the **Ripple Date Update**, pushing all subsequent sprints and the project end date forward.

> **Tip:** Always assess the timeline impact before approving a VO. Communicate the revised completion date to the client before they approve payment. Use the Gantt chart view to visualize the impact.

---

## Quick Reference: Role Permissions for Project Execution

| Action | Super Admin | Manager | Supervisor | Sales/BDE | Client |
|--------|:-----------:|:-------:|:----------:|:---------:|:------:|
| Convert quotation to project | Yes | Yes | -- | -- | -- |
| View projects list | Yes | Yes | Yes | -- | -- |
| View project details | Yes | Yes | Yes | -- | Portal |
| Update project status | Yes | Yes | -- | -- | -- |
| Update sprint dates/status | Yes | Yes | -- | -- | -- |
| Create daily logs | Yes | Yes | Yes | -- | -- |
| View daily logs | Yes | Yes | Yes | -- | Visible only |
| Create variation orders | Yes | Yes | Yes | Yes | -- |
| Approve/reject VOs | Yes | Yes | -- | -- | -- |
| Record transactions | Yes | Yes | -- | -- | -- |
| View financial health | Yes | Yes | -- | -- | -- |
| Export execution report | Yes | Yes | Yes | -- | -- |

---

## Common Workflows

### Starting a New Project

1. Ensure the quotation is in **APPROVED** status.
2. Convert the lead to a client (if not already done).
3. Navigate to the quotation and click **"Convert to Project"**.
4. Fill in the project name, start date, manager, supervisor, and site address.
5. Confirm the conversion. The system creates the project, 6 sprints, and the wallet.
6. Navigate to the new project and review the auto-generated sprint timeline.
7. Update project status to **IN_PROGRESS** when site work begins.

### Running a Daily Standup

1. Open the **Execution Tracking** page for the multi-project overview.
2. Review the summary cards for any delayed projects requiring attention.
3. Click through each active project tab to review sprint progress.
4. After the standup, supervisors log daily progress via the **Add Daily Log** form.
5. Managers review logs and toggle client visibility as appropriate.

### Handling a Client Change Request

1. Supervisor or Manager creates a **Variation Order** with the scope description and cost estimate.
2. Manager reviews and **approves** the VO.
3. Sales team communicates the additional cost to the client and collects payment.
4. Once paid, Manager updates VO status to **PAID**.
5. If the work extends a sprint, Manager updates the sprint end date (triggering cascading updates).
6. Supervisor proceeds with the additional work and logs progress in daily logs.

### Dealing with Delays

1. When a sprint falls behind, update its status to **DELAYED**.
2. Assess the impact: use the Gantt chart to see how the delay cascades to later sprints.
3. If the end date needs to change, update the sprint's end date. The system will automatically shift all subsequent sprints.
4. Communicate the revised timeline to the client.
5. Document the delay reason in a daily log (with visibility set to internal-only if sensitive).
6. Monitor the project's financial health -- delays often increase labor and overhead costs.

### Completing a Project

1. Ensure all 6 sprints are marked as **COMPLETED**. The system will not allow the project to be completed if any sprint is incomplete.
2. Complete the final sprint (Handover & Snag List) -- ensure deep cleaning, inspection, and snag resolution are documented.
3. Verify the financial position: all client payments received, all vendor and labor payments settled.
4. Update the project status to **COMPLETED**.
5. The client receives a notification that their project is complete.
