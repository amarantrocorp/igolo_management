# Lead Management & CRM Guide

This guide covers every aspect of managing leads in the Igolo Interior ERP -- from first contact through conversion to a client project. It is written for users in the BDE, Sales, Manager, and Super Admin roles.

---

## Table of Contents

1. [Lead Pipeline](#lead-pipeline)
2. [Creating a New Lead](#creating-a-new-lead)
3. [Lead Detail Page](#lead-detail-page)
4. [Lead Status Workflow](#lead-status-workflow)
5. [Lead Activities](#lead-activities)
6. [Client Requirements Page](#client-requirements-page)
7. [Site Survey Page](#site-survey-page)

---

## Lead Pipeline

**Route:** `/dashboard/sales/leads`

The Leads page is the central hub for tracking prospective clients. It supports two view modes and a full set of filters.

### Pipeline View (Kanban Board)

The default view presents leads as a horizontal Kanban board. Each column represents a stage in the sales process:

| Column | Internal Status | Color |
|---|---|---|
| New | `NEW` | Blue |
| Contacted | `CONTACTED` | Amber |
| Meeting Scheduled | `QUALIFIED` | Purple |
| Proposal Sent | `QUOTATION_SENT` | Indigo |
| Negotiation | `NEGOTIATION` | Cyan |
| Converted | `CONVERTED` | Emerald |
| Lost | `LOST` | Red |

Each column header shows a colored dot and a count badge indicating how many leads are currently in that stage.

**Lead cards** display the following information at a glance:

- Client name (bold header)
- Project location (with map pin icon)
- Budget range (with rupee icon)
- Assigned team member (abbreviated)
- Created date (highlighted in orange if older than 7 days with no status change)
- Property type and lead source tags at the bottom

**Drag-and-drop:** You can move a lead between stages by dragging its card from one column to another. The system performs an optimistic update -- the card moves immediately while the API saves the change in the background. If the save fails, the card reverts to its original column.

> **Tip:** A grip icon appears on hover at the top-right of each card, indicating it is draggable. You can also click any card to open its detail page.

### Table View

Click the **Table** toggle in the top-right of the filter bar to switch to a traditional table layout. The table columns are:

| Column | Description |
|---|---|
| Name | Client full name |
| Contact | Phone number with phone icon |
| Location | Project location (truncated if long) |
| Property | Property type and carpet area (e.g., "Apartment - 1200 sqft") |
| Budget | Budget range string |
| Source | Where the lead came from (shown as a badge) |
| Status | Current pipeline status (color-coded badge) |
| Assigned To | Team member name |
| Created | Date the lead was entered |

Click any row to open the lead detail page. A count label below the table shows "Showing X of Y lead(s)".

### Search and Filter Options

The filter bar sits between the page header and the view area. All filters work in both Pipeline and Table views.

**Search box:** Type to search by client name, phone number, email, or location. The search is case-insensitive and matches partial strings.

**Source filter:** Dropdown listing all lead sources present in the current data set (e.g., Website, Referral, Instagram, Facebook, Google Ads, Walk-in, Real Estate Partner, Just Dial, Housing.com, Other). Select a source to show only leads from that channel.

**Status filter:** Dropdown with all pipeline stages. Useful in Table view when you want to focus on a single status without switching to the pipeline.

**Assignee filter:** Dropdown listing all team members who currently have leads assigned. Select a name to see only their leads.

**Clear button:** When one or more filters are active, a "Clear" button (with an X icon) appears. Click it to reset all filters and the search box at once.

> **Tip:** Combine filters for targeted views. For example, set Source to "Instagram" and Status to "NEW" to see all fresh Instagram leads that need initial contact.

### Import Leads (CSV Upload)

Click the **Import Leads** button (upload icon) in the page header. This opens a file picker restricted to `.csv` files.

**CSV format requirements:**

- The first row must be a header row.
- Subsequent rows are treated as individual leads.
- After selecting a file, the system parses it client-side and displays a toast notification confirming how many leads were parsed.

> **Note:** After importing, refresh the page to see the newly imported leads reflected in the pipeline.

---

## Creating a New Lead

**Route:** `/dashboard/sales/leads/new`

Click the **Create Lead** button on the Leads page to open the lead creation form. The form is divided into logical sections.

### Section 1: Client Information

| Field | Required | Validation | Notes |
|---|---|---|---|
| Full Name | Yes | 2-100 characters; letters, spaces, hyphens, apostrophes, periods only | Input filter prevents numbers and special characters as you type |
| Phone Number | Yes | Valid Indian mobile (`+91`/`91` prefix + 10 digits starting with 6-9) or international (7-15 digits) | Strips spaces, hyphens, and parentheses before validating |
| Alternate Phone | No | Same format as primary phone; must differ from primary number | Useful for spouse/family contact |
| Email | No | Standard email format (`name@domain.com`) | Used for sending quotation PDFs |
| Company Name | No | Max 150 characters | Relevant for commercial/office projects |

### Section 2: Project Information

| Field | Required | Validation | Notes |
|---|---|---|---|
| Location | Yes | Min 5 characters | Uses Google Places Autocomplete for address suggestions |
| Property Type | No | Select one | Options: Apartment, Villa, Independent House, Penthouse, Studio, Office, Retail, Other. Selecting "Other" reveals a text field (required, max 100 chars). |
| BHK Configuration | No | Select one | Options: 1 BHK through 4+ BHK, plus Other. Selecting "Other" reveals a text field (required, max 100 chars). |
| Property Status | No | Select one | Options: Under Construction, Ready to Move, Occupied, Renovation, Other. Selecting "Other" reveals a text field (required, max 100 chars). |
| Carpet Area (sqft) | No | Numeric, 50-50,000 sqft | Only digits and a single decimal point allowed |
| Floor Number | No | Whole number, 0-200 | Only digits allowed |

> **Tip:** The location field supports Google Places Autocomplete. Start typing an address and select from the dropdown suggestions to ensure accurate location data.

### Section 3: Scope of Work and Preferences

| Field | Required | Validation | Notes |
|---|---|---|---|
| Scope of Work | No | Multi-select tags | Options: Full Home Interior, Kitchen, Living Room, Bedroom(s), Bathroom(s), False Ceiling, Painting, Electrical, Flooring, Furniture Only, Modular Kitchen, Wardrobe, TV Unit, Study Room, Pooja Room. Click to toggle. |
| Budget Range | No | Select one | Options: Under 5 Lakhs, 5-10 Lakhs, 10-20 Lakhs, 20-50 Lakhs, 50 Lakhs-1 Crore, Above 1 Crore |
| Design Style | No | Select one | Options: Modern, Contemporary, Minimalist, Traditional, Industrial, Scandinavian, Bohemian, Luxury, Transitional, Other |
| Timeline | No | Select one | Options: Immediately, Within 1 Month, 1-3 Months, 3-6 Months, 6+ Months, Not Decided |

### Section 4: Lead Source and Assignment

| Field | Required | Validation | Notes |
|---|---|---|---|
| Lead Source | Yes | Must select one | Options: Website, Referral, Instagram, Facebook, Google Ads, Walk-in, Real Estate Partner, Just Dial, Housing.com, Other |
| Referral Name | Conditional | Required when source is "Referral" | Enter the name of the person who referred the lead |
| Source (Other) | Conditional | Required when source is "Other", max 100 chars | Specify the custom source |
| Assigned To | No | Select from team members | If left blank, the lead is automatically assigned to the user creating it |
| Priority | No | Select one | Options: Low, Medium (default), High, Urgent. Each level is color-coded in the UI. |

### Section 5: Scheduling

| Field | Required | Validation | Notes |
|---|---|---|---|
| Possession Date | No | Cannot be in the past; cannot be more than 10 years in the future | Date picker; indicates when the client takes possession of the property |
| Site Visit Availability | No | Select one | Options: Weekdays, Weekends, Anytime, Not Available, Other |

### Section 6: Additional Details

| Field | Required | Validation | Notes |
|---|---|---|---|
| Notes | No | Max 1,000 characters | Free-text internal notes |
| Special Requirements | No | Max 500 characters | Client-specific requests (e.g., Vastu compliance, pet-friendly materials) |
| Floor Plan | No | File upload | Upload a floor plan PDF or image for reference |

### Step-by-Step Walkthrough

1. Navigate to `/dashboard/sales/leads` and click **Create Lead**.
2. Fill in the client's **Full Name** and **Phone Number** (these are mandatory).
3. Enter the **Project Location** using the autocomplete dropdown.
4. Select a **Lead Source** (mandatory). If the source is "Referral", enter the referral name.
5. Optionally fill in property details, scope of work, budget, and scheduling preferences.
6. Review the form. Any validation errors are shown inline in red below the corresponding field, with an alert icon.
7. Click **Create Lead** at the bottom. On success, you are redirected to the Leads pipeline page and a success toast appears.

> **Best Practice:** Fill in as much information as possible during the first interaction. This enriches the lead profile and helps the sales team craft more relevant quotations later.

---

## Lead Detail Page

**Route:** `/dashboard/sales/leads/[id]`

Click any lead card (Pipeline view) or table row (Table view) to open the detail page. The page has a header section and three tabs.

### Page Header

The header displays:

- **Back button:** Returns to the Leads pipeline.
- **Client name** (large bold text).
- **Status badge:** Color-coded badge showing the current pipeline stage.
- **Status dropdown:** (visible when not in edit mode and not converted) Allows changing the lead status directly. Selecting "CONVERTED" from this dropdown is blocked -- you must use the dedicated Convert button instead.
- **Edit button:** Enters inline edit mode for the Overview tab.
- **Convert to Client button:** Visible only to Managers and Super Admins when the lead has at least one approved quotation and is not already converted.

### Overview Tab

Displays the lead's complete profile in organized sections:

**Contact Information:**
- Name, phone number, email (with clickable links)

**Project Details:**
- Location, property type, property status, carpet area, floor plan link

**Scope & Preferences:**
- Scope of work (displayed as tags), budget range, design style, timeline

**Lead Summary:**
- Source, assigned team member, priority, possession date, site visit availability, notes

**Editing a Lead:**

1. Click the **Edit** (pencil icon) button in the header.
2. All display fields transform into editable inputs, dropdowns, and tag selectors.
3. The same validation rules from the creation form apply (name length, phone format, email format, etc.).
4. Click **Save** (checkmark icon) to submit changes. Validation errors appear inline if any fields are invalid; the page auto-scrolls to the first error.
5. Click **Cancel** (X icon) to discard changes and return to view mode.

> **Note:** When a lead's status is "CONVERTED", the edit button and status dropdown are hidden. Converted leads are read-only.

### Quotations Tab

Lists all quotations linked to this lead. For each quotation, the tab shows:

- Version number (e.g., v1, v2)
- Status badge (Draft, Sent, Approved, Rejected, Archived)
- Total amount in INR format
- Creation date
- Action buttons: View (opens the quotation detail), and for non-BDE roles, options to create new quotations

**Creating a quotation from the lead page:**

1. Switch to the **Quotations** tab.
2. Click **Create Quote** (if you have the Sales, Manager, or Super Admin role).
3. You are taken to the Quotation Builder with the lead pre-linked.

### Activity Tab

Shows a chronological timeline of all interactions with this lead. Each entry displays:

- Activity type icon (phone for calls, mail for emails, users for meetings, message for notes, map pin for site visits)
- Description text
- Date
- Created-by user name

The newest activities appear at the top.

### Convert to Client

The **Convert to Client** button appears when all of the following conditions are met:

1. The lead is **not** already in CONVERTED status.
2. At least one linked quotation has **APPROVED** status.
3. The current user has the **Manager** or **Super Admin** role.

**Conversion process:**

1. Click **Convert to Client** in the header area.
2. A confirmation dialog appears explaining the action.
3. Click **Confirm** to proceed.
4. The system performs two actions:
   - Creates a Client record and User account (with CLIENT role) linked to the original lead.
   - Finds the first approved quotation and creates a Project with auto-generated sprints, starting 7 days from today.
5. On success, the lead status changes to CONVERTED and a success toast appears.

> **Important:** Conversion is a one-way action. Once a lead is converted, it cannot be reverted. Make sure the quotation is finalized and the client has confirmed before converting.

---

## Lead Status Workflow

### Status Flow Diagram

```
NEW --> CONTACTED --> QUALIFIED --> QUOTATION_SENT --> NEGOTIATION --> CONVERTED
                                                                  \-> LOST
```

A lead can also be moved to LOST from any stage (except CONVERTED).

### What Each Status Means

| Status | Meaning | Typical Actions |
|---|---|---|
| **NEW** | Lead has just been entered into the system. No contact has been made. | Assign to a team member; make first contact within 24 hours. |
| **CONTACTED** | Initial contact has been made (call, email, or WhatsApp). The lead is aware of Igolo Interior. | Log the interaction as an activity; gather project requirements. |
| **QUALIFIED** | The lead has a genuine project need, reasonable budget, and realistic timeline. A meeting or site visit has been scheduled. | Schedule and conduct a site visit; begin collecting room measurements. |
| **QUOTATION_SENT** | A formal quotation (PDF) has been sent to the lead for review. | Follow up within 2-3 days; be ready to answer questions about line items. |
| **NEGOTIATION** | The lead has reviewed the quotation and is discussing pricing, scope changes, or payment terms. | Create revised quotation versions (v2, v3); document all agreed changes. |
| **CONVERTED** | The lead has accepted a quotation and been converted to a Client with an active Project. | Handoff to the project execution team; ensure all documentation is complete. |
| **LOST** | The lead has decided not to proceed, or has gone unresponsive for an extended period. | Log the reason in activities; the lead remains in the system for future re-engagement. |

### Who Can Change Status

| Role | Permissions |
|---|---|
| BDE | Can change status of their assigned leads (except to CONVERTED) |
| Sales | Can change status of their assigned leads (except to CONVERTED) |
| Manager | Can change status of any lead; can perform lead-to-client conversion |
| Super Admin | Full access to all status changes and conversion |

### Best Practices for Status Management

- **Do not skip stages.** Moving a lead from NEW directly to QUOTATION_SENT loses tracking fidelity. Follow the natural progression.
- **Update status promptly.** Change the status as soon as the real-world action occurs (e.g., move to CONTACTED right after the first call, not days later).
- **Always log an activity when changing status.** This creates an audit trail explaining why the status changed.
- **Use LOST honestly.** Marking a lead as LOST is not a failure -- it clears the pipeline so the team can focus on active opportunities.
- **Re-engagement:** A LOST lead can be moved back to CONTACTED if the client reaches out again in the future. Add a note explaining the re-engagement.

---

## Lead Activities

### Activity Types

The system supports five types of lead activities:

| Type | Icon | Use Case |
|---|---|---|
| **Call** | Phone icon | Log outbound/inbound phone calls. Include outcome (connected, voicemail, no answer). |
| **Email** | Mail icon | Log sent emails or notable received emails. Include subject line or summary. |
| **Meeting** | Users icon | Log in-person or virtual meetings. Include attendees and key discussion points. |
| **Note** | Message icon | Log internal observations, reminders, or status updates that do not fit other categories. |
| **Site Visit** | Map pin icon | Log site visits for measurement or assessment. Include findings and next steps. |

### How to Log an Activity

1. Open the lead's detail page (`/dashboard/sales/leads/[id]`).
2. Switch to the **Activity** tab.
3. Click the **Add Activity** button.
4. Fill in the activity form:
   - **Type:** Select from Call, Email, Meeting, Note, or Site Visit.
   - **Date:** Defaults to today. Can be set to a past date for retroactive logging.
   - **Description:** Free-text field (1-2,000 characters). Be specific and actionable.
5. Click **Save**. The activity appears at the top of the timeline.

### Activity Timeline View

Activities are displayed in reverse chronological order (newest first). Each entry shows:

- A colored icon representing the activity type
- The description text
- The date of the activity
- The name of the user who logged it
- A timestamp showing when the entry was created

> **Best Practice:** Log every meaningful interaction, even brief ones. A well-maintained activity log is invaluable when a lead is handed off between team members, or when a LOST lead re-engages months later.

### Sample Activity Descriptions

- **Call:** "Called client at 3:15 PM. Discussed project timeline. Client confirmed 3BHK apartment in Whitefield. Interested in modular kitchen + wardrobes. Wants quotation by Friday."
- **Email:** "Sent introductory email with company portfolio and recent project photos. Included link to 3D walkthrough of similar 3BHK project."
- **Meeting:** "Virtual meeting via Zoom with Mr. and Mrs. Sharma. Reviewed mood board. Client prefers modern-minimalist style. Budget confirmed at 15-20L range. Site visit scheduled for Saturday."
- **Site Visit:** "Visited site at Prestige Lakeside. 1450 sqft 3BHK, 12th floor. Measurements taken for all rooms. Existing flooring in good condition. False ceiling needed in living and master bedroom. Photos uploaded."
- **Note:** "Client traveling until March 15. Will follow up after that. Do not call before then."

---

## Client Requirements Page

**Route:** `/dashboard/client-requirements`

**Accessible to:** Super Admin, Manager, Supervisor, Sales

This page is used to capture detailed client preferences and family information before the design phase begins. It is typically filled out during or after the qualification meeting.

### Project Overview Fields

| Field | Type | Notes |
|---|---|---|
| Client/Lead Name | Text input | The name of the client or lead this requirement document pertains to |
| Project Location | Text input | Address or locality of the project site |
| Property Type | Select dropdown | Options: 1BHK, 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Flat Size | Text input | Total area in sqft |
| Budget Range | Select dropdown | Options: Under 5 Lakh through Above 1 Cr |

### Design Preferences

| Field | Type | Notes |
|---|---|---|
| Design Styles | Multi-select chips | Options: Modern, Minimal, Luxury, Contemporary, Traditional, Scandinavian. Click to toggle. Multiple can be selected. |
| Scope of Work | Multi-select chips | Options: Full Home, Kitchen, Master Bedroom, Kids Bedroom, Guest Bedroom, Living Room, Dining Room, Bathroom, Balcony, Pooja Room, Study Room, Wardrobe, False Ceiling, Electrical, Painting |
| Special Requirements | Textarea | Free-text for Vastu compliance, accessibility needs, material preferences, etc. |
| Reference Ideas | Textarea | Links or descriptions of inspirational designs the client has shared |
| Budget Constraints | Textarea | Specific budgetary notes (e.g., "Kitchen is priority, can reduce bedroom budget") |

### Family Details

This section captures household composition, which directly influences design decisions (storage needs, safety considerations, room layouts).

| Field | Type | Notes |
|---|---|---|
| Total Members | Number input | Total people living in the home |
| Kids | Number input | Number of children; affects room theming and safety |
| Elderly Members | Number input | Affects accessibility features (grab bars, non-slip flooring) |
| Pets | Number input | Affects material choices (scratch-resistant, easy-clean surfaces) |

### Reference Uploads

You can upload reference images, mood boards, or inspiration photos using the drag-and-drop area or the file picker.

### Saving as Draft

The Client Requirements page automatically saves form data to the browser's local storage. If you navigate away and return, your previous entries are restored.

To explicitly save:
1. Fill in all relevant fields.
2. Click **Save as Draft** to persist the current state to local storage.
3. A success toast confirms the save.

> **Best Practice:** Complete this form during the qualification meeting with the client present. It ensures nothing is lost between the meeting and the design phase.

---

## Site Survey Page

**Route:** `/dashboard/site-survey`

**Accessible to:** Super Admin, Manager, Supervisor, Sales

The Site Survey page is used to record physical measurements, infrastructure details, and observations from an on-site visit. This data feeds directly into the design and quotation process.

### Project Information

At the top of the form, fill in the basic project context:

| Field | Description |
|---|---|
| Client Name | Name of the client whose site is being surveyed |
| Location | Site address |
| Property Type / Size | E.g., "3BHK / 1450 sqft" |
| Surveyed By | Name of the team member conducting the survey |

### Room Measurements

The room measurement section uses a dynamic table where you can add and remove rooms.

**Table columns:**

| Column | Description |
|---|---|
| Room Name | Free text (e.g., "Master Bedroom", "Kitchen", "Living Room") |
| Length (ft) | Room length in feet |
| Width (ft) | Room width in feet |
| Height (ft) | Ceiling height in feet |
| Windows | Number of windows |
| Doors | Number of doors |
| Notes | Room-specific observations (e.g., "exposed beam at 8ft", "window faces west") |

**Adding a room:**
1. Click the **Add Room** button below the table.
2. A new empty row appears.
3. Fill in the room name and measurements.

**Removing a room:**
1. Click the **Delete** (trash icon) button on the row you want to remove.
2. The row is removed immediately.

> **Tip:** Start with the room name, then measure L x W x H in that order. Consistency in naming (e.g., always "Master Bedroom" not "MBR") helps when referencing rooms in quotations.

### Electrical Points

Record the existing and planned electrical infrastructure:

| Field | Description |
|---|---|
| Light Points | Total number of light points across the site |
| Fan Points | Total number of ceiling fan points |
| AC Points | Number of air conditioning power points |
| Switch Boards | Count of switch board locations |
| Extra Notes | Additional observations (e.g., "main DB in utility room, needs upgrade") |

### Plumbing Points

Record the plumbing infrastructure:

| Field | Description |
|---|---|
| Kitchen Sink Points | Number of kitchen sink water connections |
| Wash Basins | Count of wash basin connections |
| Geyser Provisions | Number of geyser/water heater connection points |
| Washing Machine | Washing machine water and drain point availability |
| Water Changes Notes | Notes on water pressure, supply timing, or required plumbing changes |

### Site Observations

General observations about the site condition:

| Field | Description |
|---|---|
| Wall Condition | Describe the state of existing walls (e.g., "good condition", "dampness on north wall", "needs replastering") |
| Ceiling Condition | Note any issues (cracks, water stains, uneven surface) |
| Floor Notes | Existing flooring type and condition |
| Beam/Column Notes | Structural elements that affect design (e.g., "exposed beam in living room at 9ft") |
| Special Constraints | Any site-specific limitations (e.g., "no freight elevator, material must be carried via stairs", "society restricts work to 9am-6pm") |

### File Uploads

Use the upload area at the bottom of the page to attach:

- Site photographs
- Existing floor plans (PDF or image)
- Builder layout drawings
- Any other reference documents

Files are categorized by type (image, PDF, other) and display their file size.

### Saving the Survey

Click **Save Survey** to persist all entered data. A success toast confirms the save.

> **Best Practice:** Take photos of every room, including close-ups of problem areas (dampness, cracks, old wiring). These photos are referenced throughout the project lifecycle and are essential for accurate quotations.

---

## Quick Reference: Role Access Summary

| Feature | BDE | Sales | Manager | Super Admin |
|---|---|---|---|---|
| View Leads | Yes | Yes | Yes | Yes |
| Create Leads | Yes | Yes | Yes | Yes |
| Edit Leads | Own | Own | All | All |
| Change Lead Status | Yes (not CONVERTED) | Yes (not CONVERTED) | Yes | Yes |
| Create Quotations | No | Yes | Yes | Yes |
| Convert Lead to Client | No | No | Yes | Yes |
| Log Activities | Yes | Yes | Yes | Yes |
| Client Requirements | No | Yes | Yes | Yes |
| Site Survey | No | Yes | Yes | Yes |

---

## Keyboard Shortcuts and Navigation Tips

- Use the browser's back button or the **Back** arrow in the page header to return to the pipeline from any detail page.
- In Pipeline view, the board scrolls horizontally if your screen is narrower than the total column width.
- In Table view, click any column header area to identify the sort context (sorting is by creation date by default).
- The search box in the filter bar responds immediately as you type -- no need to press Enter.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Lead card does not move when dropped | Check your network connection. The API must be reachable for status updates. If the mutation fails, the card reverts. |
| "Insufficient permissions" error | Your role does not have access to the requested action. Contact a Super Admin to verify your role assignment. |
| Validation errors on lead creation | Read the red error message below each field. Common issues: phone number not in valid Indian format, name too short, location fewer than 5 characters. |
| Convert button not visible | Ensure at least one quotation linked to the lead has APPROVED status, and that you are logged in as Manager or Super Admin. |
| CSV import shows 0 leads | The CSV file may be empty or missing a header row. Ensure the first row contains column headers. |
| Location autocomplete not working | Google Places API must be configured and active. Check with your system administrator. |
| Draft not restored on Client Requirements page | Local storage may have been cleared. Drafts are browser-specific and do not sync across devices. |
