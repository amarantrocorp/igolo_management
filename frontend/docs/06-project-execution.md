# Managing Projects & Execution

Once your client approves a quotation, it is time to turn plans into reality. This guide covers everything from converting a quotation into a live project, through tracking day-to-day progress on site, to handling changes along the way.

---

## Table of Contents

1. [How a Quotation Becomes a Project](#how-a-quotation-becomes-a-project)
2. [Understanding the 6 Phases of Every Project](#understanding-the-6-phases-of-every-project)
3. [The Project Dashboard](#the-project-dashboard)
4. [Daily Site Logs](#daily-site-logs)
5. [Execution Tracking](#execution-tracking)
6. [What Happens When Plans Change (Variation Orders)](#what-happens-when-plans-change-variation-orders)

---

## How a Quotation Becomes a Project

### The Conversion Process

Every project in Igolo Interior follows a clear path:

**Approve the quotation** -- The client reviews and accepts the quotation you sent them.

**Convert the lead to a client** -- Before creating a project, the lead must be converted to a client record. This creates a login account for the client so they can access their own portal and track progress. The client receives their login details by email.

**Create the project** -- A manager or admin triggers the conversion from the quotation page. You will need to fill in:

- A project name (for example, "Villa 402 - Complete Interior")
- The start date (when site work begins)
- The assigned project manager
- The assigned site supervisor
- The site address

### What Gets Created Automatically

When you convert a quotation, the system does a lot of the setup work for you:

- **6 work phases** are generated automatically, each with calculated start and end dates based on your start date (more on these phases below)
- **A project timeline** is created showing all phases in sequence, with the expected completion date calculated
- **Budget tracking** is initialized -- the project gets its own financial wallet set to the quotation value, ready to track every payment and expense
- **The quotation is archived** so it cannot be accidentally edited or converted again
- **The lead is marked as converted**
- **Everyone gets notified** -- the client receives an email that their project has started, and both the manager and supervisor receive notifications about their new assignment

A quotation can only be converted once. If you try to convert an already-converted quotation, the system will let you know that a project already exists.

---

## Understanding the 6 Phases of Every Project

Every interior design project follows a standardized 6-phase execution model. These phases represent the proven industry workflow for delivering a complete interior fit-out.

### Phase 1: Design & Approvals (10 days)

This is where you finalize all layouts and material choices with the client. Key activities include completing 2D and 3D layouts, confirming material selections, and getting the client's final sign-off on the design before any site work begins.

### Phase 2: Civil & Demolition (15 days)

The physical work starts here. This phase covers breaking walls where needed, removing debris, preparing the flooring base, and any structural modifications. It is often dusty and noisy, but it lays the foundation for everything that follows.

### Phase 3: Electrical & Plumbing (10 days)

All the behind-the-walls work happens in this phase -- electrical wiring, plumbing pipes, AC duct installation, and concealed cabling. This must be completed before woodwork begins, because once the walls are closed, changes become very expensive.

### Phase 4: Woodwork & Carpentry (25 days)

The longest phase. This is when wardrobes are built, kitchen cabinets are installed, false ceiling frames go up, and all the custom woodwork takes shape. It is the phase that transforms the space most visibly.

### Phase 5: Finishing & Painting (12 days)

The project starts looking like a finished home. Laminates are applied, walls get their paint coats, electrical fittings are installed, and hardware (handles, knobs, channels) is fitted. This is where attention to detail matters most.

### Phase 6: Handover & Cleaning (5 days)

The final stretch. Deep cleaning is done throughout the space, a thorough inspection catches any remaining issues (the "snag list"), and once everything is resolved, the keys are handed over to the client.

### How Phases Are Connected

Each phase depends on the one before it. Phase 2 cannot start until Phase 1 is complete, Phase 3 cannot start until Phase 2 is done, and so on.

If one phase gets delayed, the system automatically shifts all the phases that follow. For example, if the Civil phase runs 5 days over, the Electrical phase shifts forward by 5 days, then Woodwork shifts, and so on right through to Handover. This "ripple effect" keeps the timeline realistic and ensures everyone knows the updated schedule.

The total default duration across all six phases is approximately 77 days, but this adjusts automatically based on actual progress.

---

## The Project Dashboard

The project dashboard is your command centre for every active project. It is organized into tabs so you can quickly find what you need.

### Overview

The Overview tab gives you a snapshot of the project's health at a glance:

- **Project value** -- The total agreed amount for the project
- **Balance** -- How much has been received from the client minus how much has been spent (shown in green if positive, red if negative)
- **Sprint progress** -- How many of the 6 phases are complete, with a percentage
- **Timeline** -- The start date and expected end date

If the project is overdue (the expected end date has passed and it is not yet complete), a warning banner appears at the top.

The overview also breaks down costs by category -- labour, materials, and other expenses -- so you can see where the money is going.

### Sprint/Phase View (Gantt Chart)

The Sprints tab shows all 6 phases visually. You can switch between two views:

- **Gantt chart** -- A horizontal bar chart showing each phase as a coloured bar. Grey for upcoming phases, blue for in-progress, green for completed, and red for delayed. Hover over a bar to see the duration in days.
- **List view** -- Each phase shown as a card with its status, date range, and notes.

The Gantt chart is especially useful for client meetings -- it gives a clear visual of where the project stands and what is coming next.

### Updating Progress

For any phase that is currently active, you will see a progress slider. Simply drag it to update the completion percentage (for example, 60% complete). The value saves automatically.

Managers can also update phase dates if needed. When you change a phase's end date, the system automatically shifts all subsequent phases forward (or back), keeping the entire timeline consistent.

### Finance Tab

The Finance tab shows the complete financial picture for the project:

- **Total agreed value** -- The original quotation amount plus any approved variation orders
- **Total received** -- All client payments that have been verified
- **Total spent** -- All approved expenses (materials, labour, petty cash)
- **Current balance** -- What is left (received minus spent)
- **Pending approvals** -- Expenses that are waiting to be verified

You can also record new payments or expenses directly from this tab. The system will prevent any expense that would exceed the available balance -- more on this in the Financial Management guide.

A full transaction history shows every payment and expense in chronological order.

---

## Daily Site Logs

### Why They Matter

Daily site logs replace the chaos of WhatsApp groups with structured, searchable records of what happened on site each day. They create an auditable trail of progress, help keep the client informed, and make it easy to spot issues early.

### How to Add a Daily Log

1. Go to the project's Daily Logs tab (or use the Execution Tracking page for quick logging across projects).
2. Select which phase the work belongs to.
3. Write a description of what was completed that day (for example, "Completed wardrobe carcass in Master Bedroom. Started laminate work in kids room.").
4. Optionally add any blockers or issues (for example, "Cement shortage" or "Client changed design").
5. Upload up to 5 photos showing site progress -- completed work areas, material deliveries, or the team at work.
6. Set the progress percentage for the phase.
7. Click **Save**.

### Choosing What the Client Can See

This is an important feature. Every daily log has a **"Visible to Client"** toggle:

- **Turn it ON** to share the log with the client through their portal. Great for positive updates and milestone completions.
- **Leave it OFF** (the default) to keep the log internal. Use this for entries about rework, quality issues, worker incidents, or delays you are managing behind the scenes.

Managers can review all logs and selectively toggle visibility before the client sees anything. This lets your team maintain transparency while controlling the message around sensitive situations.

Clients see a simplified feed in their portal showing only the logs you have made visible -- along with the date, phase name, progress notes, and photos.

---

## Execution Tracking

### Monitoring Multiple Projects at Once

The Execution Tracking page gives you a bird's-eye view across all your active projects. At the top, summary cards show:

- **Active sites** -- How many projects are currently in progress
- **Sprints completed** -- Total completed phases across all projects
- **On-schedule** -- Projects where no phase is delayed
- **Delayed** -- Projects with at least one delayed phase

Click on any project to see its phase timeline, today's activities, and any open issues.

### Identifying Delayed Projects

Delayed projects are flagged clearly in the summary. When you click into a delayed project, you can see exactly which phase is behind schedule and by how much. The visual timeline uses colour coding -- red for delayed phases, blue for active ones, green for completed ones.

### Running a Daily Standup

The Execution Tracking page is perfect for daily team standups:

1. Review the summary cards for any projects that need attention.
2. Click through each active project to check sprint progress.
3. After the standup, supervisors log daily progress using the quick-add form.
4. Managers review logs and set client visibility as needed.

### Exporting Reports

Click **"Export Report"** to download a project's sprint data as a spreadsheet. The export includes each phase's name, status, dates, and completion percentage -- useful for sharing with stakeholders or keeping offline records.

---

## What Happens When Plans Change (Variation Orders)

It is common for clients to request changes after the project has started -- an extra wardrobe in the guest room, a different countertop material, an additional false ceiling. Variation Orders (VOs) are how Igolo Interior handles these changes formally, making sure nothing falls through the cracks.

### Client Wants Something Extra? Here Is How to Handle It

When a client asks for additional work that was not in the original quotation, here is the process:

1. **Create a variation order** from the project's Variation Orders tab.
2. Fill in what the extra work involves, how much it will cost, and which phase it falls under.
3. Optionally upload a supporting document or image.
4. Click Submit.

The variation order is created in "Requested" status, and all managers are notified.

### Adding a Variation Order

Click **"+ New Variation Order"** on the project page and provide:

- **Description** -- What the additional work is (for example, "Add false ceiling in guest bedroom")
- **Additional cost** -- How much the extra work will cost
- **Linked phase** -- Which project phase this work falls under (optional but recommended)
- **Supporting document** -- Any photos or documents that support the request (optional)

### The Approval and Payment Process

A variation order follows a clear workflow:

1. **Requested** -- The VO has been submitted and is awaiting review.
2. **Approved** -- A manager has reviewed it and agreed the work should proceed.
3. **Rejected** -- The manager has declined the request (with a reason).
4. **Paid** -- The client has paid for the additional work.

The important rule: work on a variation order cannot begin until the client has paid for it. This protects both your company and the client by keeping costs transparent and agreed upon upfront.

### Impact on Budget and Timeline

When a variation order is paid:

- The project's total agreed value increases by the VO amount
- The total received increases by the payment amount
- Your team now has additional spending capacity for materials and labour related to the extra work

If the VO adds significant work to a phase, the manager may need to extend that phase's end date. When this happens, all subsequent phases shift automatically, and the project's expected completion date updates accordingly. Always communicate the revised timeline to the client before they approve payment.

---

## Common Workflows

### Starting a New Project

1. Make sure the quotation is approved by the client.
2. Convert the lead to a client (if not already done).
3. Go to the quotation and click **"Convert to Project"**.
4. Fill in the project details and confirm.
5. Review the auto-generated phase timeline on the new project page.
6. Update the project status to "In Progress" when site work begins.

### Handling Delays

1. Update the delayed phase's status to "Delayed".
2. Check the Gantt chart to see how the delay impacts later phases.
3. If the end date needs to change, update it -- the system shifts all subsequent phases automatically.
4. Communicate the revised timeline to the client.
5. Document the delay reason in a daily log (keep it internal if sensitive).

### Completing a Project

1. Make sure all 6 phases are marked as complete.
2. Ensure the final phase (Handover & Cleaning) is documented -- deep cleaning done, inspection passed, snags resolved.
3. Verify the financial position -- all client payments received, all vendor and labour costs settled.
4. Update the project status to "Completed".
5. The client receives a notification that their project is finished.
