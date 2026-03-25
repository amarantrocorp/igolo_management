# Quotation & Design Phase Guide

This guide covers the complete Quotation and Design Phase workflow in the Igolo Interior ERP. It walks through design concept creation, drawing management, the Smart Quotation Wizard, AI floor plan analysis, BOQ generation, and budget approval.

**Applicable Roles:** Super Admin, Manager, Sales

---

## Table of Contents

1. [Design Concepts Page](#1-design-concepts-page)
2. [Drawings Page](#2-drawings-page)
3. [Smart Quotation Wizard](#3-smart-quotation-wizard)
4. [AI Floor Plan Analysis](#4-ai-floor-plan-analysis)
5. [Quotation Management](#5-quotation-management)
6. [BOQ & Estimates Page](#6-boq--estimates-page)
7. [Budget Approval Page](#7-budget-approval-page)

---

## 1. Design Concepts Page

**Route:** `/dashboard/design-concepts`

The Design Concepts page is where the design team defines the aesthetic direction, material palette, and visual references for a project. It serves as the creative brief that guides all downstream quotation and execution decisions.

### 1.1 Project Information Header

At the top of the page, fill in the project context fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Client Name** | Full name of the client | Rajesh Sharma |
| **Project Location** | Site address or locality | Whitefield, Bangalore |
| **Property Type** | Configuration of the property | 3 BHK Apartment |
| **Lead Designer** | Designer assigned to this project | Priya Menon |

These fields provide context for anyone reviewing the concept document.

### 1.2 Aesthetic Direction

#### Design Style Selection

Select one design style from the available options. Click a chip to select it; clicking another chip deselects the previous one. Available styles:

- **Modern** -- Clean lines, neutral tones, functional furniture
- **Minimal** -- Stripped-back aesthetic, open spaces, muted colours
- **Luxury** -- Rich materials, ornate details, high-end finishes
- **Contemporary** -- Current trends blended with timeless elements
- **Traditional** -- Classic Indian or heritage-inspired interiors
- **Scandinavian** -- Light wood, white walls, cozy textiles

#### Color Palette

Define three colours that form the project's palette:

- **Primary** -- The dominant colour used across walls, large surfaces, and major furniture. Enter a hex code (e.g., `#2D2D2D`) or a descriptive name (e.g., "Charcoal Gray"). A circular preview swatch updates live as you type.
- **Secondary** -- The supporting colour for accent furniture, cabinetry, or feature walls.
- **Accent** -- A pop colour used sparingly in cushions, artwork, or lighting fixtures.

### 1.3 Material Selection

Select the material finish for each category. These are single-select chip selectors unless otherwise noted.

| Category | Options | Selection Type |
|----------|---------|----------------|
| **Wardrobe Finish** | Laminate, Veneer, Acrylic, PU, Glass | Single select |
| **Kitchen Finish** | Laminate, Veneer, Acrylic, PU, Glass | Single select |
| **Wall Panels** | Laminate, Veneer, Acrylic, PU, Glass, Fluted Panel, Fabric Padding | Multi-select |
| **Flooring Type** | Free-text input (e.g., "Italian Marble, Vitrified Tiles") | Text input |
| **Countertop Material** | Free-text input (e.g., "Quartz, Granite, Corian") | Text input |

Wall Panels supports multi-select -- click multiple chips to combine panel types across different rooms.

### 1.4 Client Feedback Section

Two text areas capture feedback from stakeholders:

- **Comments / Requirements** -- Record client preferences, must-haves, or special requests. Example: "Client wants a walk-in closet in the master bedroom. Prefers warm lighting throughout."
- **Revision Notes** -- Internal notes from the designer or manager about requested changes. Example: "Revision 2: Client rejected veneer finish for wardrobes; switch to PU."

### 1.5 Moodboard & References

The moodboard is organized by room/category tabs:

- Living Room
- Kitchen
- Bedroom
- Wardrobe
- Lighting
- Decor

**How to upload reference images:**

1. Select the appropriate tab (e.g., "Kitchen").
2. Click the **"Add Reference Image"** card (dashed border with a plus icon).
3. A file picker opens -- select one or multiple image files.
4. Uploaded images appear as thumbnail cards within the selected tab.
5. Each card shows the filename at the bottom.
6. Hover over a card and click the **X** button in the top-right corner to remove an image.

Images are stored per-tab. Switching tabs shows only images uploaded to that specific category.

### 1.6 Saving and Sharing

- **Save Concept** -- Saves the entire form (project info, style, colours, materials, feedback) as a draft to local storage. You can return to the page later and your data will be restored.
- **Send for Review** -- Sends the design concept to the client or manager for review and feedback.
- **Back to Site Survey** -- Navigates back to the site survey page if you need to update measurements first.

---

## 2. Drawings Page

**Route:** `/dashboard/drawings`

The Drawings page manages all technical drawings and visual assets for a project, including 2D layouts, electrical plans, and 3D renders.

### 2.1 Project Information Header

Similar to the Design Concepts page, fill in:

- **Client Name**
- **Project Name**
- **Property Type**
- **Designer**

### 2.2 Drawing Library Overview

The drawing library displays all uploaded drawings as a responsive card grid. Each drawing card shows:

- **Thumbnail** -- A gradient placeholder with the drawing type label (or the uploaded image)
- **Version badge** -- Top-right corner (e.g., "v1", "v2")
- **Title** -- The drawing name
- **Tags** -- Room name and drawing type as outline badges
- **Designer** -- Who created the drawing
- **Date** -- Upload date

The card grid adapts from 1 column on mobile to 4 columns on large screens.

### 2.3 Upload Drawings

To upload new drawings:

1. Click the **"Upload Drawing"** button in the header.
2. The file picker opens -- accepted formats include images (`image/*`), PDFs (`.pdf`), and DWG files (`.dwg`).
3. Select one or more files. Multiple files can be uploaded at once.
4. Each file is added to the library with:
   - Title derived from the filename (extension stripped)
   - Type defaulting to "2D Layout"
   - Room set to "General"
   - Version set to "v1"
   - Designer set to "You"
   - Date set to today

**Drawing types supported:**

| Type | Description |
|------|-------------|
| 2D Layout | Floor plan showing room arrangement and dimensions |
| Furniture Layout | Placement of furniture within each room |
| Electrical Layout | Switchboard, outlet, and lighting point locations |
| Ceiling Layout | False ceiling design with lighting and cove details |
| Plumbing Layout | Water supply and drainage point positions |
| 3D View | Rendered perspective views of designed spaces |

### 2.4 Filter by Type and Room

Two filter rows let you narrow down the drawing library:

**Filter by Type** -- Click a chip to show only drawings of that type:
- All, 2D Layout, Furniture Layout, Electrical Layout, Ceiling Layout, Plumbing Layout, 3D View

**Filter by Room** -- Click a chip to show only drawings for that room:
- All Rooms, Living Room, Kitchen, Master Bedroom, Guest Bedroom, Bathroom, Balcony, Dining Area

Filters work together -- selecting "Electrical Layout" and "Kitchen" shows only kitchen electrical drawings. Select "All" and "All Rooms" to clear filters.

### 2.5 Version Management

Each drawing card displays its version (e.g., "v1", "v2", "v3"). When uploading a revised version of an existing drawing:

1. Upload the new file as normal.
2. Update the version number on the card to reflect the revision.
3. Previous versions remain in the library for historical reference.

### 2.6 Revision Requests

The **Client Comments** section at the bottom of the page manages revision requests:

**To create a revision request:**

1. Type the revision note in the **Review Notes** textarea. Example: "Please move the electrical outlet in the master bedroom to the opposite wall."
2. Click **"Add Revision Request"**.
3. The request appears in the list below with:
   - The revision text
   - Date created
   - Status badge: **Pending** (amber clock icon)

**To mark a revision as resolved:**

1. Click the status icon (clock) next to the revision.
2. The status toggles to **Resolved** (green checkmark), and the text shows a strikethrough.
3. Click again to toggle back to Pending if needed.

### 2.7 Additional Actions

- **Add Layout** -- Adds a placeholder layout entry to the library.
- **Save** -- Saves all drawings data and revisions as a draft.
- **Send for Client Review** -- Sends the drawings package to the client for approval.
- **Back to Design Concept** -- Navigates back to the Design Concepts page.

---

## 3. Smart Quotation Wizard

**Route:** `/dashboard/sales/quotes/new`

The Smart Quotation Wizard is a 7-step guided process that builds a complete quotation from project details through to final pricing. It features auto-calculation of quantities based on room dimensions, package-based pricing multipliers, and real-time cost updates.

### 3.0 Start Screen -- Choose Your Entry Mode

Before entering the wizard steps, you choose how to begin:

| Option | Description |
|--------|-------------|
| **Start From Scratch** | Build a quotation step by step with full control. Resets the wizard and starts at Step 1. |
| **Upload Layout Plan** | Upload a floor plan image. AI analyses it to detect rooms and dimensions, then auto-populates the wizard. See [AI Floor Plan Analysis](#4-ai-floor-plan-analysis). |
| **Use Template** | Pre-fills with a Standard 3BHK Package (property type: 3BHK, package: Standard, budget: 10-15L) and auto-selects the 8 standard rooms for a 3BHK. Jumps to Step 1 with data pre-filled. |
| **Reuse Previous Quotation** | Opens a dialog to clone an existing quotation. Select from your saved quotations, and the wizard pre-fills all fields from the original. |

Select a card and click **Continue**, or certain options (Upload, Template, Reuse) proceed directly.

### 3.1 Step 1: Project & Client Details

This step collects all foundational information about the client and project.

#### Client Information

| Field | Type | Description |
|-------|------|-------------|
| **Client Name** | Text | Full name of the client (required) |
| **Email** | Email | Client email address for sending the quotation |
| **Phone** | Phone | Contact number; only digits, +, spaces, hyphens, and parentheses are accepted |

If you entered the wizard with a `lead_id` URL parameter (e.g., from the Leads page), the client name, email, and phone are auto-populated from the lead record.

#### Project Details

| Field | Type | Description |
|-------|------|-------------|
| **Project Name** | Text | Descriptive project title (e.g., "Prestige Lakeside Villa") |
| **City** | Dropdown | Select from 20 major Indian cities (Bangalore, Mumbai, Delhi, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Noida, Gurgaon, Jaipur, Lucknow, Chandigarh, Kochi, Coimbatore, Indore, Nagpur, Vadodara, Visakhapatnam, Mysore) |

#### Property Type Selection

Select one property type from the chip selector. This selection determines which rooms are auto-selected in Step 2.

| Property Type | Label |
|---------------|-------|
| 1BHK | 1 BHK |
| 2BHK | 2 BHK |
| 3BHK | 3 BHK |
| 4BHK | 4 BHK |
| VILLA | Villa |
| PENTHOUSE | Penthouse |
| OFFICE | Office |
| COMMERCIAL | Commercial |

Property type is **required** to proceed to the next step.

#### Flat Size & Budget Range

| Field | Type | Options |
|-------|------|---------|
| **Flat Size** | Number (sqft) | Free entry (e.g., 1500) |
| **Budget Range** | Dropdown | Under 5L, 5-10L, 10-15L, 15-25L, 25-50L, 50L+ |

#### Package Selection

Select one of four packages. The package determines default materials and applies a price multiplier to all item costs. Package selection is **required**.

| Package | Default Wood | Default Finish | Default Hardware | Default Countertop | Price Multiplier |
|---------|-------------|---------------|-----------------|-------------------|-----------------|
| **Basic** | Commercial Ply | Laminate | Basic | Granite | 1.0x (base) |
| **Standard** | BWR Ply | Laminate | Hettich Standard | Granite | 1.15x (+15%) |
| **Premium** | BWP Ply | Acrylic | Hettich Premium | Quartz | 1.35x (+35%) |
| **Luxury** | HDHMR | PU | Blum | Corian | 1.6x (+60%) |

Each package card displays an icon, the package name, and a short description. The active package is highlighted with a blue background.

**Validation:** Client Name, Property Type, and Package Type are all required. The wizard will not advance to Step 2 until these are filled.

### 3.2 Step 2: Room Selection

This step presents a grid of 14 room types. Select which rooms to include in the quotation.

#### Room Grid

Each room appears as a card with an icon, name, and a checkbox indicator. Click a card to toggle its selection. The grid displays 2 columns on mobile and 4 columns on desktop.

| Room | Icon | Auto-selected for |
|------|------|-------------------|
| Living Room | Sofa | 1BHK, 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Dining Area | Utensils | 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Kitchen | Chef Hat | 1BHK, 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Utility | Wrench | 1BHK, 2BHK, 3BHK, 4BHK, Villa |
| Master Bedroom | Double Bed | 1BHK, 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Guest Bedroom | Single Bed | 2BHK, 3BHK, 4BHK, Villa, Penthouse |
| Kids Bedroom | Star | 3BHK, 4BHK, Villa, Penthouse |
| Pooja Room | Flame | 3BHK, 4BHK, Villa |
| Foyer | Door | 3BHK, 4BHK, Villa, Penthouse |
| Balcony | Home | Villa only |
| Study Room | Book | 4BHK, Villa |
| TV Unit Area | Monitor | Manual selection only |
| Bar Unit | Wine Glass | Penthouse only |
| Shoe Rack Area | Footprints | Manual selection only |

#### Auto-Selection Based on Property Type

Click **"Select Standard Rooms"** to automatically select the rooms mapped to your chosen property type. For example, selecting 3BHK and clicking "Select Standard Rooms" selects: Living Room, Dining Area, Kitchen, Master Bedroom, Guest Bedroom, Kids Bedroom, Utility, and Foyer (8 rooms).

#### Custom Room Addition

To add a room not in the predefined list:

1. Click the **"Add Room"** card (dashed border with plus icon).
2. A text input appears -- type the custom room name (e.g., "Home Theatre").
3. Click **"Add"** or press Enter.
4. The custom room appears in the grid as a selected card.

#### Room Dimensions

When a room is selected, dimension inputs appear directly on the card:

- **L** -- Length in feet
- **B** -- Breadth in feet
- **H** -- Height in feet

These dimensions are used in Step 3 to auto-calculate item quantities (e.g., false ceiling area = L x B, wardrobe width = B, perimeter = 2(L+B)).

Enter approximate values in feet for the best results.

#### Toolbar Actions

- **Reset** -- Deselects all rooms and clears dimensions.
- **Select Standard Rooms** -- Auto-selects rooms based on the property type from Step 1. Disabled if no property type is selected.

**Validation:** At least one room must be selected to proceed.

### 3.3 Step 3: Item Selection

This step displays each selected room as an expandable accordion. For each room, select which interior items to include.

#### Room Accordion

Each room shows:
- Room icon and name
- Count of selected items vs. total available (e.g., "3/7 items selected")
- A "Room Builder" label
- Click to expand/collapse

#### Three Item Tiers

Items within each room are organized into three tiers:

| Tier | Label | Behaviour |
|------|-------|-----------|
| **Recommended** | Green sparkle icon, "RECOMMENDED ITEMS" | Core items that most projects need. Auto-selected by default when using templates. |
| **Optional** | Gray settings icon, "OPTIONAL ITEMS" | Useful additions that enhance the space. Deselected by default. |
| **Premium** | Amber crown icon, "PREMIUM ITEMS" | High-end upgrades for luxury projects. Deselected by default. |

#### Item Row Details

Each item row displays:
- **Checkbox** -- Blue when selected
- **Item name** -- e.g., "TV Unit", "Wardrobe", "False Ceiling"
- **Rate** -- Base rate per unit (e.g., "1,200/rft", "75/sqft")
- **Calculated price** -- Shown when selected, auto-computed from room dimensions and the package multiplier
- **Wrench icon** -- Visual indicator for customization

Click an item row to toggle its selection. The calculated price updates instantly.

#### Price Calculation Logic

The price for each item is calculated as:

```
Quantity = f(room dimensions, formula type)
Price = Quantity x Base Rate x Package Multiplier
```

Formula types used for quantity:
- `floor_area` -- L x B (for false ceilings)
- `wall_length` -- L x H (for back panels, accent walls)
- `wall_area` -- 2(L+B) x H (for full wall panelling)
- `perimeter` -- 2(L+B) (for cove lighting, base cabinets)
- `length` -- L (for TV units, countertops)
- `width` -- B (for wardrobes, curtain pelmets)
- `fixed` -- A preset value (for standalone items like shoe racks)

**Validation:** At least one item must be selected across all rooms to proceed.

### 3.4 Step 4: Material & Finish Selection

This step lets you choose materials that apply cost multipliers to all selected items.

#### Apply Mode Toggle

Two modes are available via toggle buttons at the top:

- **Apply to All Rooms** -- Select materials once and they apply globally. This is the default and recommended approach.
- **Customize per Room** -- Switch to a tab-based view where each room gets its own material selections. Useful when the kitchen needs different finishes from bedrooms.

#### Material Categories

Four material categories are presented as cards:

**1. Core Wood Material**

The base plywood used for all carpentry work.

| Option | Price Impact |
|--------|-------------|
| Commercial Ply | -15% (0.85x) |
| BWR Ply | -5% (0.95x) |
| BWP Ply | Base (1.0x) |
| HDHMR | +10% (1.1x) |

**2. Finish Type**

The surface finish applied to all woodwork. This has the highest price impact.

| Option | Price Impact |
|--------|-------------|
| Laminate | Base (1.0x) |
| Acrylic | +20% (1.2x) |
| PU | +25% (1.25x) |
| Veneer | +35% (1.35x) |

Finish Type and Kitchen Countertop categories display a **"Price Impact"** badge to alert users that these selections significantly affect the total cost.

**3. Hardware Package**

Hinges, channels, and handles used in all cabinetry.

| Option | Price Impact |
|--------|-------------|
| Basic | Base (1.0x) |
| Hettich Standard | Base (1.0x) |
| Hettich Premium | +8% (1.08x) |
| Blum | +15% (1.15x) |

**4. Kitchen Countertop**

Slab material for kitchen work surfaces. This category only appears if a Kitchen room is included in the quotation.

| Option | Price Impact |
|--------|-------------|
| Granite | Base (1.0x) |
| Corian | +30% (1.3x) |
| Quartz | +40% (1.4x) |
| Sintered Stone | +60% (1.6x) |

#### Pricing Impact Reference

An informational box at the bottom summarizes the key cost differences:

- Acrylic finish adds approximately 20% over base Laminate cost
- PU finish adds approximately 25% over base Laminate cost
- Veneer finish adds approximately 35% over base Laminate cost
- Blum hardware adds approximately 15% over standard hardware
- Quartz countertop adds approximately 40% over Granite

### 3.5 Step 5: Add-ons

This step presents optional services and premium extras organized into four categories.

#### Civil & Services

| Add-on | Base Price |
|--------|-----------|
| Painting | 12,000 |
| Profile Lighting | 10,000 |

#### Furniture & Decor

| Add-on | Base Price |
|--------|-----------|
| Loose Furniture | 25,000 |
| Decor Items | 15,000 |
| Curtains | 18,000 |

#### Utility Works

| Add-on | Base Price |
|--------|-----------|
| Electrical Work | 20,000 |
| Plumbing Work | 15,000 |
| Civil Modifications | 30,000 |
| Deep Cleaning | 5,000 |

#### Premium Add-ons

| Add-on | Base Price |
|--------|-----------|
| Glass Partitions | 25,000 |
| Smart Locks | 8,000 |
| Appliance Integration | 12,000 |

Each add-on appears as a card with a checkbox. Click a card to toggle selection. The base price is displayed below the add-on name. Selected cards show a highlighted border.

### 3.6 Step 6: Pricing Review

This step shows the complete pricing breakdown with live discount calculation.

#### Room-wise Detailed Breakdown Table

A table with the following columns:

| Column | Description |
|--------|-------------|
| ROOM | Room name (e.g., "Living Room") |
| ITEM | Item name (e.g., "TV Unit") |
| SPECIFICATION | Auto-generated specs: quantity with unit, wood material, and finish type |
| RATE | Base rate per unit |
| AMOUNT | Calculated total for that line item |

The table footer shows the **Sub-total (Base)** summing all line items.

#### Upgrade Cost Summary Cards

Three summary cards highlight additional costs beyond the base:

- **Material Upgrade** -- Additional cost from selected wood and finish upgrades compared to base defaults
- **Hardware Upgrade** -- Premium hardware package cost difference
- **Add-ons Cost** -- Sum of all selected add-on services

#### Adjustments & Discounts

- **Flat Discount (%)** -- Enter a percentage (0-100) to apply a flat discount. The field accepts decimal values (e.g., 7.5%).
- **Discount Amount** -- Calculated live and displayed in orange. Formula: `(Base Cost + Upgrades + Add-ons) x Discount%`

**Validation:** Discount must be between 0% and 100%.

### 3.7 Step 7: Generate & Complete

This is the final step where the quotation is reviewed and finalized.

#### Quotation Preview Card

A styled preview card with a blue header displays:

**Client Details:**
- Name, Email, Phone

**Project Scope:**
- Property type, Area (sqft), City, Package

**Rooms Included:**
- Badge list of all selected rooms

**Cost Breakdown:**

| Line | Description |
|------|-------------|
| Base Interior Cost | Sum of all room items at base rates |
| Material Upgrades | Cost from wood/finish selections above base |
| Hardware Upgrades | Cost from hardware selection above base |
| Add-ons | Sum of selected optional services |
| Discount | Subtracted if a discount percentage was applied |
| GST (18%) | Goods and Services Tax applied to the post-discount subtotal |
| **Total Amount** | Final quotation value |

#### Action Cards

Four action cards are available after saving:

| Action | Description | Requires Save |
|--------|-------------|--------------|
| **Download PDF** | Downloads the quotation as a formatted PDF document | Yes |
| **Send to Client** | Emails the quotation to the client email address entered in Step 1 | Yes |
| **Duplicate** | Preserves the current wizard state so you can modify and generate a new quotation | No |
| **Convert to Project** | Converts the approved quotation into an active project with auto-generated sprints | Yes |

Actions that require the quotation to be saved first appear dimmed until the "Complete Quotation" button is clicked.

#### Complete Quotation Button

Click **"Complete Quotation"** to save the quotation to the database via the API. The button shows a loading spinner during save. Once saved:

- The quote ID is displayed (e.g., "QT-3A8F1BC2")
- The button text changes to "Quotation Saved"
- Download PDF, Send to Client, and Convert to Project become active

#### Next Steps Information

An info box explains what happens after the quotation is approved:

1. Client reviews and approves the quotation via email or the client portal
2. Once approved, convert to a project to begin the 6-sprint execution cycle
3. Standard sprints will be auto-generated with calculated timelines
4. The project wallet will be initialized for financial tracking

---

## 4. AI Floor Plan Analysis

The AI Floor Plan Analysis feature allows you to upload an architectural floor plan and have the system automatically detect rooms, dimensions, and BHK configuration.

### 4.1 How to Access

From the Wizard Start Screen, select **"Upload Layout Plan"**. This opens the Upload Layout Dialog.

### 4.2 Uploading a Floor Plan

1. Click the file upload area or drag and drop a file.
2. **Supported formats:** JPEG, PNG, WebP, PDF
3. **Maximum file size:** 15 MB
4. The file is uploaded to the server and a URL is generated.

### 4.3 Running the Analysis

1. After uploading, click **"Analyze Layout"**.
2. An animated progress indicator appears with the message "Analyzing floor plan... Detecting rooms, dimensions, and suggesting items".
3. The analysis calls the AI service (powered by a vision model) which processes the floor plan image.
4. Analysis may take up to 5 minutes depending on image complexity and server load.

### 4.4 What AI Extracts

The analysis returns the following data:

| Data Point | Description | Example |
|------------|-------------|---------|
| **BHK Configuration** | Detected apartment type | "3 BHK" |
| **Room Count** | Number of distinct rooms identified | 8 |
| **Total Carpet Area** | Estimated total area in sqft | 1,450 sqft |
| **Room List** | Each room with name and area | "Master Bedroom - 180 sqft" |
| **Suggested Items** | Recommended interior items per room | Based on room type mapping |
| **Notes** | Additional observations from the AI | "L-shaped kitchen detected" |

### 4.5 Confidence Scoring

Each analysis includes a confidence score (0-100%):

- **50-100%** -- Results displayed normally with a confidence badge
- **Below 50%** -- An orange warning banner appears: "Low confidence analysis. Please verify the detected rooms and dimensions."

Always review AI-detected values before proceeding, especially room dimensions and count.

### 4.6 How Extracted Data Auto-Populates the Wizard

When you click **"Apply & Continue"**:

1. The detected BHK configuration maps to a property type (e.g., "3 BHK" maps to "3BHK")
2. The total carpet area populates the Flat Size field
3. Detected rooms are auto-selected in the Room Selection step (Step 2)
4. Room dimensions from the analysis populate the L x B x H fields
5. The wizard advances to Step 1 with data pre-filled

Alternatively, click **"Ignore & Add Manually"** or **"Skip & Add Manually"** to bypass the AI results and enter rooms by hand.

### 4.7 Error Handling

If the analysis fails, an error message is displayed. Common scenarios:

- **Timeout** -- "Analysis timed out. The AI model may be overloaded. Try again or use a smaller image."
- **Service unreachable** -- "Cannot reach the AI service. Make sure floorplan-ai is running."
- **HTTP error** -- "Analysis failed (HTTP {status}). Please try again or add rooms manually."

You can retry the analysis or skip and proceed manually.

---

## 5. Quotation Management

**Route:** `/dashboard/sales/quotes`

The Quotation Management page is the central hub for all quotations.

### 5.1 Quotation List Page

The page displays a table of all quotations with the following columns:

| Column | Description |
|--------|-------------|
| **Quote ID** | Shortened UUID in monospace format (e.g., "QT-3A8F1BC2") |
| **Lead / Client** | Name of the associated lead |
| **Version** | Version badge (e.g., "v1", "v2") |
| **Total Amount** | Formatted currency value |
| **Status** | Colour-coded status badge |
| **Created** | Date in DD MMM YYYY format |
| **Actions** | "Open" link to the quotation detail page |

### 5.2 Filters

- **Search** -- Type to search by Quote ID or Lead/Client name. Searches are case-insensitive.
- **Status Filter** -- Dropdown to filter by status: All Statuses, Draft, Sent, Approved, Rejected, Archived.

### 5.3 Version History

Quotations support versioning. When a quotation is revised:

- A new version is created (v1, v2, v3, etc.)
- Each version retains its own room/item selections, materials, and pricing
- The version number is displayed as a badge in the table and on detail pages
- Previous versions remain accessible for comparison

### 5.4 Status Workflow

Quotations follow this lifecycle:

```
DRAFT --> SENT --> APPROVED --> (Converted to Project)
                --> REJECTED
                --> ARCHIVED
```

| Status | Badge Colour | Description |
|--------|-------------|-------------|
| **DRAFT** | Gray | Initial state; quotation is being built or edited |
| **SENT** | Blue | Quotation has been emailed to the client |
| **APPROVED** | Green | Client has accepted the quotation |
| **REJECTED** | Red | Client has declined the quotation |
| **ARCHIVED** | Outline | Quotation is no longer active (superseded by a newer version or cancelled) |

### 5.5 PDF Generation and Download

From the quotation detail page or Step 7 of the wizard:

1. Click **"Download PDF"**.
2. The system generates a formatted PDF via the backend API endpoint (`GET /quotes/{id}/pdf`).
3. The PDF downloads automatically with the filename `quotation-{id}.pdf`.

The PDF includes:
- Company branding and logo
- Client details
- Room-wise item breakdown with specifications
- Material and finish selections
- Pricing summary with GST
- Terms and conditions

### 5.6 Sending Quotes via Email

1. Click **"Send to Client"** on the quotation detail page or in Step 7.
2. The system calls `POST /quotes/{id}/send`.
3. The quotation PDF is emailed to the client's email address.
4. The quotation status changes from DRAFT to SENT.
5. A success notification confirms delivery.

### 5.7 Creating a New Quotation

Click the **"New Quote"** button in the page header to navigate to the Smart Quotation Wizard. This button is visible to Super Admin, Manager, and Sales roles (not BDE).

---

## 6. BOQ & Estimates Page

**Route:** `/dashboard/boq`

The Bill of Quantity (BOQ) page generates a detailed cost estimate from an approved quotation. It is accessible to Super Admin and Manager roles.

### 6.1 Auto-Generation from Approved Quotation

The BOQ page automatically loads from an approved quotation:

- If a `quote_id` URL parameter is provided (e.g., `/dashboard/boq?quote_id=abc123`), that specific quotation is loaded.
- Otherwise, the system fetches the latest approved quotation.
- If no approved quotation exists, an empty state is shown with a link to the Quotations page.

### 6.2 Material & Item Quantities Table

The table groups items by room and displays:

| Column | Description |
|--------|-------------|
| **Room / Category** | Room header row, then category per item row |
| **Item & Specs** | Item name with markup percentage |
| **Unit** | Unit of measurement |
| **Qty** | Quantity from the quotation |
| **Rate** | Unit price |
| **Amount** | Quantity x Rate |

Room headers span the full width as highlighted section dividers. The table footer shows the **Material Total**.

### 6.3 Labour Estimates

Labour costs are estimated as part of the internal cost calculation. The BOQ factors in:

- Material cost (from the quotation items)
- Transport and handling (2% of material cost)
- Contingency (5% of material cost)

These percentages are applied automatically.

### 6.4 Cost Summary

A summary section at the bottom displays:

| Line | Calculation |
|------|-------------|
| Material Cost | Sum of all item amounts |
| Transport & Handling (2%) | Material Cost x 0.02 |
| Contingency (5%) | Material Cost x 0.05 |
| **Total Estimated Cost** | Sum of above |

A disclaimer note states: "This is an internal estimated cost for budget planning. Final costs may vary based on actual vendor pricing and site conditions."

### 6.5 Add Custom Items

To add items not in the original quotation:

1. Click **"Add Custom Item"** to expand the inline form.
2. Fill in: Room, Item name, Specifications, Unit, Quantity, and Rate.
3. Click **"Add"** to append the item to the BOQ.
4. The Amount is calculated automatically (Qty x Rate).
5. Custom items can be edited inline (pencil icon) or deleted (trash icon).

### 6.6 Export to CSV

Click **"Export Excel"** to download the BOQ data as a CSV file (`boq-estimate.csv`). The export includes columns: Room, Category, Item, Specs, Unit, Qty, Rate, Amount.

### 6.7 Send for Budget Approval

Click **"Send for Budget Approval"** to route the BOQ to the Budget Approval page. This navigates to `/dashboard/budget-approval` and triggers a notification for the approver.

### 6.8 Sync with Quotation

If the underlying quotation is updated, click **"Sync Quotation"** to refresh the BOQ data with the latest quotation values.

---

## 7. Budget Approval Page

**Route:** `/dashboard/budget-approval`

The Budget Approval page is where Managers and Super Admins review the internal cost breakdown and make a go/no-go decision. It is accessible to Super Admin and Manager roles.

### 7.1 Project Context Card

Displays key information about the quotation under review:

- **Quotation ID** -- Full UUID of the quotation
- **Version** -- Current version number (e.g., "v2")
- **Status** -- Current quotation status badge

### 7.2 Category-wise Cost Breakdown

A table breaks down costs by room:

| Column | Description |
|--------|-------------|
| **Room** | Room name from the quotation |
| **Amount** | Total cost for that room |

The table footer shows the overall **Total**.

### 7.3 Financial Summary

The financial summary calculates internal margins:

| Line | Description |
|------|-------------|
| **Base Estimated Cost** | Total from the room-wise breakdown |
| **Contingency Risk** | 5% buffer for unexpected costs |
| **Total Internal Cost** | Base + Contingency |
| **Target Margin** | 25% (configurable; shown as a green badge) |
| **Final Client Quote Value** | Internal Cost / (1 - Margin%), ensuring the target margin is preserved |

A warning note states: "Minimum recommended margin is 20%. Projects approved below this threshold require Super Admin sign-off."

### 7.4 Approval Actions

Three action buttons are available in the page header:

| Action | Effect |
|--------|--------|
| **Approve Budget & Convert** | Approves the budget and initiates project conversion. Requires confirmation dialog. Redirects to the Projects page after 1.5 seconds. |
| **Request Revision** | Sends the budget back to the BOQ stage for adjustments. Status updates accordingly. |
| **Reject** | Rejects the budget outright. A destructive action shown in red. |

### 7.5 Approval Details

The approval section captures:

- **Approver** -- Current user's name and role (auto-populated)
- **Decision** -- Dropdown to select: Approve, Request Revision, or Reject
- **Comments** -- Free-text area for notes, conditions, or reasons for the decision
- **Date** -- Today's date (auto-populated, read-only)

### 7.6 Approval Workflow

The complete approval flow:

```
BOQ Generated
    |
    v
Budget Review (this page)
    |
    |--> Approve --> Project Conversion (auto-generates 6 sprints, initializes wallet)
    |
    |--> Request Revision --> Returns to BOQ for adjustments
    |
    |--> Reject --> Quotation may be revised or archived
```

When a budget is approved and converted:
1. A new Project record is created
2. Six standard sprints are auto-generated with calculated dates
3. The project wallet is initialized with the agreed value
4. The system redirects to the Projects dashboard

---

## Quick Reference: End-to-End Workflow

The complete Quotation & Design Phase follows this sequence:

```
1. Design Concepts    Define style, colours, materials, moodboard
       |
       v
2. Drawings           Upload and manage 2D/3D drawings
       |
       v
3. Quotation Wizard   7-step guided quotation builder
   (or AI Upload)     with auto-pricing
       |
       v
4. Quote Management   Send, version, track status
       |
       v
5. BOQ Generation     Auto-generate detailed cost estimate
       |
       v
6. Budget Approval    Manager reviews and approves
       |
       v
7. Project Conversion Auto-generate sprints and wallet
```

Each stage feeds into the next, ensuring a structured handoff from creative vision through to commercial commitment.
