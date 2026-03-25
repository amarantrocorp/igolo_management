# Inventory, Vendors & Labour Management

Running an interior design business means juggling materials, vendors, and labour teams across multiple projects. Igolo Interior brings it all together in one place -- so you always know what is in stock, what has been ordered, and who is working where.

---

## Table of Contents

1. [Material Planning](#material-planning)
2. [Vendors](#vendors)
3. [Purchase Orders](#purchase-orders)
4. [Labour Management](#labour-management)
5. [Attendance Tracking](#attendance-tracking)
6. [Weekly Payroll](#weekly-payroll)

---

## Material Planning

### Viewing Your Inventory

The Material Planning page is your central hub for everything in your warehouse. At the top, three summary cards give you a quick snapshot:

- **Total items** -- How many distinct materials you are tracking
- **Low stock alerts** -- How many items have fallen below their minimum stock level and need attention
- **Pending indents** -- Material requests from supervisors that are waiting for your approval

Below the summary, the inventory table lists every tracked material with its name, category (Plywood, Tiles, Hardware, Paint, Adhesive, and so on), unit of measurement, current stock level, reorder level, base price, linked vendor, and status.

You can search by material name, filter by category, or toggle "Low Stock Only" to see just the items that need restocking.

### Creating a Material Indent

Supervisors working on site do not buy materials themselves. Instead, they submit a **material indent** -- a formal request for materials from the warehouse.

Here is how it works:

1. The supervisor selects the material they need from the inventory list.
2. They enter the quantity required, select the project it is for, and set the priority (Normal, High, or Urgent).
3. They can add notes like "Need by Thursday for wardrobe framing".
4. They submit the request.

The manager receives a notification and can approve or reject the indent. If approved, the materials are issued from the warehouse, the stock count decreases, and the cost is booked to the project's wallet.

The system also checks the project wallet balance before issuing stock. If the project does not have enough funds, the issue is blocked until the client makes their next payment.

### Low Stock Alerts -- What They Mean and What to Do

When a material's stock falls below its reorder level, it gets flagged with a red "Low Stock" badge. The Low Stock Alerts count at the top of the page tells you how many items need attention.

When you see low stock alerts:

1. Review which items are running low.
2. Click the **"Reorder"** button next to any low-stock item. This creates a draft purchase order pre-filled with the item and its preferred vendor, saving you time.
3. Complete the purchase order and send it to the vendor.

We recommend checking low-stock items at least once daily. Delayed reorders cause project timeline slippages that cascade through all dependent phases.

---

## Vendors

### Adding a New Vendor

To register a new supplier:

1. Go to the Vendor section.
2. Click **"Add Vendor"**.
3. Fill in the vendor's details -- company name, contact person, phone, email, address, and GST number (for tax invoice reconciliation).
4. Save.

The vendor is now available in vendor dropdowns across the system, including when creating purchase orders.

### Linking Vendors to Inventory Items

Each material in your inventory can be supplied by multiple vendors, and each vendor can supply multiple materials. To link a vendor to an item:

1. Go to the item's detail page.
2. Under the "Suppliers" section, click **"Add Supplier"**.
3. Select the vendor, enter their price for this item, and optionally add the expected delivery lead time (in days).
4. Save.

This information is used when creating purchase orders to show you the best-priced supplier and expected delivery timelines.

A good practice is to link at least two vendors per high-usage item. This gives you a fallback option when your primary vendor is out of stock or running behind.

### Vendor Contact Information

The vendor directory shows all registered suppliers with their contact details, GST numbers, and the number of purchase orders placed with each. Each vendor also has a performance dashboard showing total orders, total spend, delivery reliability (what percentage of orders were received on time), and a breakdown of orders by status.

Comparing delivery rates across vendors supplying the same item helps you make smarter procurement decisions -- a vendor with a 95% delivery rate may be worth paying slightly more for.

---

## Purchase Orders

### What Is a PO?

A Purchase Order (PO) is a formal request to buy materials from a vendor. It specifies exactly what you need, how much, and at what price. POs create a paper trail that protects both you and the vendor.

### Creating a Purchase Order

1. Click **"New Purchase Order"** on the Purchasing page.
2. **Select the vendor** from your registered vendor list.
3. **Decide if it is project-specific** (more on this below).
4. **Add line items** -- select each material, enter the quantity, and confirm the unit price (this auto-fills from your vendor-item link if you have set one up).
5. The system calculates the total for each line and the overall PO amount.
6. Review and save. The PO is created in Draft status.

### General Stock POs vs Project-Specific POs

This is an important distinction:

**General stock POs** are for materials you buy in bulk and keep in your warehouse -- things like cement, adhesives, screws, and general-purpose plywood. When these goods arrive, your warehouse stock count goes up. The cost sits as company overhead until the materials are issued to a specific project.

**Project-specific POs** are for materials bought for a specific client -- things like a designer chandelier, Italian marble slabs, or a particular colour of laminate the client chose. These items go straight to the project site and never enter your warehouse. When they arrive, the cost is immediately charged to the project's wallet.

When creating a PO, toggle "Project-Specific" on if the materials are for a particular project. You will need to select which project they are for. Leave it off for general warehouse restocking.

### Tracking PO Status

Every purchase order moves through these stages:

1. **Draft** -- You are still preparing the order. You can edit line items freely.
2. **Ordered** -- You have finalized and sent the order to the vendor. Line items are locked.
3. **Received** -- The goods have arrived and been checked in.

You can also cancel a PO at any point before it is received.

When you mark a PO as "Received":

- For general stock POs, your warehouse inventory increases automatically.
- For project-specific POs, the cost is charged to the project wallet. The system checks the wallet balance first -- if there are not enough funds, the receive action is blocked until the client makes a payment.

Always verify the physical goods against the PO line items before clicking "Mark as Received." Once received, the stock changes and financial transactions are committed.

---

## Labour Management

### Adding Workers and Teams

Labour in Igolo Interior is organized into **teams**. Each team has a leader, a specialization, and a payment arrangement.

To create a new team:

1. Go to the Labour page.
2. Click **"Add Team"**.
3. Enter the team name (for example, "Roy's Painting Crew"), the leader's name and contact number, and select their specialization.
4. Choose the payment model -- daily wage or contract (more on this below).
5. Set the default daily rate per worker.
6. Save.

To add individual workers to a team:

1. Click **"Add Worker"**.
2. Enter the worker's name and select their team.
3. Set their skill level -- Helper, Skilled, or Foreman. Each level has a typical rate range.
4. Optionally set a custom daily rate for this worker (if different from the team default).
5. Save.

You can search and filter workers by trade, by project assignment, or by name.

### Assigning Workers to Projects

Workers and teams are assigned to projects through the attendance logging process. When a supervisor logs attendance for a team on a particular project, that team is effectively assigned to that project for tracking purposes.

### Types of Labour

**Daily wage teams** are paid based on attendance -- how many workers showed up, how many hours they worked, and their daily rate. This is the most common arrangement for general labour, helpers, and smaller crews.

**Contract teams** are paid a fixed amount for completing a defined scope of work. For example, a carpentry team might be contracted at Rs. 45 per square foot for false ceiling installation across 1,000 square feet, totalling Rs. 45,000. Payments are made when milestones are reached (such as 50% on framing completion and 50% on finishing). Attendance is still tracked for records, but it does not determine the payment amount.

### Specializations

Teams are categorized by their trade:

- **Carpentry** -- Wardrobes, kitchen cabinets, false ceiling framing
- **Painting** -- Wall prep, primer, paint coats, texture finishes
- **Electrical** -- Wiring, switchboards, light fittings, AC points
- **Plumbing** -- Piping, tap installation, drainage, water heaters
- **Civil** -- Wall breaking, demolition, flooring base, masonry
- **General** -- Cleaning, transport, helper work, miscellaneous tasks

---

## Attendance Tracking

### How the Supervisor Marks Daily Attendance

Every day, the site supervisor records who was on site and what they did. The process is designed to be quick and mobile-friendly:

1. **Select the project** -- for example, "Villa 402".
2. **Select the current phase** -- this links the labour cost to the correct stage of the project.
3. **Select the team** -- for example, "Carpentry Team A".
4. **Enter the headcount** -- how many workers were present.
5. **Enter hours worked** -- defaults to a full 8-hour day. Adjust if the team worked a half day or overtime.
6. **Upload a site photo** -- a photo of the team on site. This is recommended as it helps prevent inflated headcounts and provides proof of attendance.
7. **Add notes** -- describe what was accomplished (for example, "Completed wardrobe carcass in Master Bedroom. Started laminate in kids room.").
8. **Submit.**

The attendance log is saved as "Pending" and sent to the manager for review.

We recommend logging attendance on the same day the work happens. Backdating entries raises audit flags and delays payroll processing.

### Hours Worked and Cost Calculation

The system automatically calculates the cost for each attendance entry:

**Cost = Workers present x Daily rate x (Hours worked / 8)**

For example, if 4 workers at Rs. 800 per day work a full 8-hour day, the cost is Rs. 3,200. If the same team only works 4 hours, the cost is Rs. 1,600.

For contract teams, the cost is still calculated for informational purposes, but actual payments are based on milestone completion, not daily attendance.

### Uploading Site Photos as Proof

Site photos serve an important purpose -- they help verify that the reported headcount actually matches reality. This is a common challenge in the industry, and having photographic evidence keeps everyone honest.

Supervisors should take a photo of the team on site each morning and attach it to the day's attendance entry. Managers can then review these photos alongside the attendance records during the weekly payroll approval.

---

## Weekly Payroll

### Reviewing the Week's Attendance

Managers typically process payroll once a week, usually on Saturdays. Here is how it works:

1. **Select the pay period** -- choose the week you are processing (for example, Monday 10th to Saturday 15th).
2. **Review the grouped entries** -- the system gathers all pending attendance records and groups them by team and project. For each group, you see:
   - Team name and specialization
   - Project name
   - Number of days worked that week
   - Average worker count per day
   - Total hours
   - Total calculated cost
3. **Check the details** -- review the attendance entries, notes, and site photos to confirm everything looks accurate.

### Approving Payments

When you are satisfied with the records:

1. Click **"Approve"** on each team-project entry (or approve in batch).
2. The system checks the project wallet to make sure there are enough funds to cover the payroll amount.
3. If funds are available, the attendance records are marked as approved and a payment transaction is created on the project wallet.
4. If funds are insufficient, the approval is blocked. You will need to collect the next client payment before processing payroll for that project.

All attendance records in a single approval must belong to the same project. Cross-project batch approvals are not permitted.

### How It Affects the Project Budget

Every approved payroll run deducts from the project wallet, just like a material purchase. The labour cost appears in the project's financial history under the "Labour" category.

This means the same spending lock applies to labour as it does to everything else. If the project wallet is running low, labour payments are blocked until the client tops up. It is a good idea to review attendance records throughout the week rather than waiting until Saturday -- this gives you time to request client top-ups if the wallet is running low.

---

## Common Scenarios

### Stock Running Low on Plywood

1. Check the Material Planning page -- you see a red "Low Stock" badge on Plywood 18mm.
2. Click "Reorder" to create a draft PO pre-filled with the item and preferred vendor.
3. Adjust the quantity, review the price, and save.
4. Move the PO to "Ordered" status to send it to the vendor.
5. When goods arrive, click "Mark as Received" to update your warehouse stock.

### Supervisor Needs Marble for a Specific Project

1. The supervisor submits a material indent specifying the project, the marble type, and quantity needed.
2. The manager reviews and approves the indent.
3. The admin creates a project-specific PO (toggle "Project-Specific" on, select the project).
4. When the marble arrives at site, the admin marks the PO as received.
5. The project wallet is charged automatically. No warehouse stock changes.

### Payroll Shows Insufficient Funds

1. The manager opens the payroll dashboard for the current week.
2. They click "Approve" on the carpentry team entry (Rs. 24,000).
3. The system blocks it: "Insufficient funds. Available balance: Rs. 18,000. Required: Rs. 24,000."
4. The manager contacts the client to request a top-up of at least Rs. 6,000.
5. The client pays via their portal or bank transfer.
6. Once the payment is verified, the project wallet is credited.
7. The manager retries the payroll approval -- this time it goes through.
