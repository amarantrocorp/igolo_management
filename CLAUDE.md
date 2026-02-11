
# 🏗️ Interior Design ERP - Master Execution Plan

## Page 1: System Architecture, Stack, and Foundation

### 1. Project Overview

**Project Name:** `IntDesignERP`
**Description:** A monolithic ERP system for an Interior Design company handling the full lifecycle: `Lead -> Quotation -> Conversion -> Execution -> Handover`.
**Key Features:** Role-based access (RBAC), Inventory Management, Dynamic Quotations, Sprint-based Project Management (Standard 6 Phases), Financial Tracking (Spend vs. Received), Labor Management, and Client Portals.

### 2. Technology Stack Strategy

We are adhering to a strict **FastAPI + Next.js** architecture for maximum performance and type safety.

#### **Backend (API)**

* **Language:** Python 3.11+
* **Framework:** `FastAPI` (Async)
* **Database:** `PostgreSQL` (latest stable)
* **ORM:** `SQLAlchemy` (Async session) or `SQLModel`
* **Migrations:** `Alembic`
* **Authentication:** `OAuth2` with `JWT` (Access + Refresh tokens)
* **Validation:** `Pydantic v2`
* **PDF Generation:** `WeasyPrint` or `ReportLab` (for Quotations/Invoices)

#### **Frontend (Client)**

* **Framework:** `Next.js 14+` (App Router)
* **Language:** `TypeScript`
* **Styling:** `Tailwind CSS`
* **Component Library:** `shadcn/ui` (Radix UI based)
* **State Management:** `Zustand` (Global store) + `TanStack Query` (Server state/caching)
* **Forms:** `React Hook Form` + `Zod` (Schema validation)

### 3. User Roles & Permissions (RBAC)

The system must enforce strict view/edit permissions based on these roles.

| Role | Access Level |
| --- | --- |
| **Super Admin** | Full Access (System Config, All Financials, User Management). |
| **Manager** | Project Oversight, Approval of Quotations, Financial Overrides. |
| **BDE (Business Dev)** | Lead Generation, Initial Contact logging. |
| **Sales** | Lead Qualification, Quotation Creation, Client Communication. |
| **Supervisor** | On-site execution, Labor attendance, Material requests (Indent). |
| **Client** | View-only (Project Status, Sprints), Payment Gateway interaction. |
| **Labor/Contractor** | (Optional) Task status updates, view daily tasks. |

### 4. Global Domain Models (High-Level)

These are the core pillars of the application logic.

1. **Identity:** Users, Roles, Auth Profiles.
2. **Inventory:** Items (Base/Selling Price), Vendors, Purchase Orders, Stock Logs.
3. **CRM:** Leads, Interactions, Quotations (Versioning: v1, v2...), Rooms (Kitchen, Bedroom).
4. **Projects:** Active Projects, Milestones (Sprints), Variation Orders (VOs).
5. **Financials:** Invoices, Payments (Client In), Expenses (Vendor/Labor Out), Wallets.
6. **Labor:** Teams, Workers, Daily Wages/Contract Logs, Attendance.

### 5. Repository Structure

The coding agent should initialize the repository with this specific structure to ensure separation of concerns.

```text
/int-design-erp
├── /backend                    # FastAPI Application
│   ├── /app
│   │   ├── /api                # Route Controllers
│   │   │   ├── /v1             # API Versioning
│   │   │   │   ├── /auth
│   │   │   │   ├── /inventory
│   │   │   │   ├── /projects
│   │   │   │   ├── /quotes
│   │   │   │   └── ...
│   │   ├── /core               # Config, Security, Exceptions
│   │   ├── /db                 # Database connection & Base models
│   │   ├── /models             # SQLAlchemy Database Tables
│   │   ├── /schemas            # Pydantic Response/Request Models
│   │   ├── /services           # Business Logic Layer
│   │   └── main.py             # App Entry Point
│   ├── /alembic                # DB Migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── /frontend                   # Next.js Application
│   ├── /app                    # App Router Pages
│   │   ├── (auth)              # Login/Forgot Password layouts
│   │   ├── (dashboard)         # Protected Routes (Sidebar layout)
│   │   │   ├── /admin
│   │   │   ├── /sales
│   │   │   ├── /projects
│   │   │   └── ...
│   ├── /components             # Reusable UI Components
│   ├── /lib                    # Utilities (API clients, formatters)
│   ├── /store                  # Zustand Stores
│   ├── /types                  # TypeScript Interfaces
│   └── package.json
│
└── docker-compose.yml          # Orchestration

```

---

##  Schema & Entity Relationships

### 1. Core Principles

* **ORM:** `SQLAlchemy` (Async) with `Pydantic` models for validation.
* **Keys:** Use `UUID` (v4) for all Primary Keys to ensure scalability and obscure IDs in URLs.
* **Audit Fields:** Every table must have `created_at` (UTC) and `updated_at` (UTC). Most should have `created_by` (User ID).

### 2. User Management & Auth (RBAC)

This module handles authentication and role enforcement.

```python
# models/user.py

class User(Base):
    id: UUID
    email: str (Unique, Index)
    hashed_password: str
    full_name: str
    role: Enum("SUPER_ADMIN", "MANAGER", "BDE", "SALES", "SUPERVISOR", "CLIENT", "LABOR_LEAD")
    is_active: bool = True
    
    # Relationships
    leads_managed: List["Lead"]
    projects_managed: List["Project"]
    labor_logs: List["LaborLog"]

```

### 3. CRM & Pre-Sales (Leads to Clients)

Tracking the journey from a raw lead to a signed contract.

```python
# models/crm.py

class Lead(Base):
    id: UUID
    name: str
    contact_number: str
    source: str (e.g., "Website", "Referral")
    status: Enum("NEW", "CONTACTED", "QUALIFIED", "QUOTATION_SENT", "NEGOTIATION", "CONVERTED", "LOST")
    assigned_to_id: UUID (ForeignKey -> User.id)
    notes: Text
    
    quotations: List["Quotation"]

class Client(Base):
    id: UUID
    user_id: UUID (ForeignKey -> User.id) # Login access
    lead_id: UUID (ForeignKey -> Lead.id) # Origin
    address: str
    gst_number: str (Optional)
    wallet_balance: Decimal (Current funds available)

```

### 4. Quotation Engine (The Complex Part)

This requires a deep hierarchy. Quotations are versioned.

```python
# models/quotation.py

class Quotation(Base):
    id: UUID
    lead_id: UUID
    version: int (1, 2, 3...)
    total_amount: Decimal
    status: Enum("DRAFT", "SENT", "APPROVED", "REJECTED", "ARCHIVED")
    valid_until: DateTime
    
    rooms: List["QuoteRoom"]

class QuoteRoom(Base):
    id: UUID
    quotation_id: UUID
    name: str (e.g., "Master Bedroom", "Kitchen")
    area_sqft: float
    
    items: List["QuoteItem"]

class QuoteItem(Base):
    id: UUID
    room_id: UUID
    inventory_item_id: UUID (ForeignKey -> Item.id)
    description: str (Custom override)
    quantity: float
    unit_price: Decimal (Snapshot of price at time of quote)
    markup_percentage: float
    final_price: Decimal

```

### 5. Inventory & Procurement

Handling General Stock vs. Project-Specific Orders.

```python
# models/inventory.py

class Item(Base):
    id: UUID
    name: str
    category: str (e.g., "Plywood", "Tiles", "Hardware")
    unit: str (e.g., "sqft", "nos", "kg")
    base_price: Decimal (Cost Price)
    selling_price: Decimal (Standard List Price)
    current_stock: float
    reorder_level: float
    
    # Vendors who supply this
    suppliers: List["VendorItem"]

class Vendor(Base):
    id: UUID
    name: str
    contact_info: str

class PurchaseOrder(Base):
    id: UUID
    vendor_id: UUID
    status: Enum("DRAFT", "ORDERED", "RECEIVED", "CANCELLED")
    
    # Critical Distinction
    is_project_specific: bool
    project_id: UUID (Nullable, if specific)
    
    items: List["POItem"]

```

### 6. Project Execution (The "Conversion")

The core operational logic.

```python
# models/project.py

class Project(Base):
    id: UUID
    client_id: UUID
    accepted_quotation_id: UUID
    status: Enum("NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED")
    start_date: Date
    expected_end_date: Date
    
    # Financial Snapshots
    total_project_value: Decimal
    total_received: Decimal
    total_spent: Decimal
    
    sprints: List["Sprint"]
    variation_orders: List["VariationOrder"]

class Sprint(Base):
    id: UUID
    project_id: UUID
    sequence_order: int (1 to 6)
    name: str (e.g., "Sprint 1: Civil Work")
    status: Enum("PENDING", "ACTIVE", "COMPLETED", "DELAYED")
    start_date: Date
    end_date: Date
    dependency_sprint_id: UUID (Nullable, points to previous sprint)

class VariationOrder(Base):
    """Handles changes AFTER the main contract is signed."""
    id: UUID
    project_id: UUID
    description: str
    additional_cost: Decimal
    status: Enum("REQUESTED", "APPROVED", "REJECTED", "PAID")

```

### 7. Financials & Labor

Tracking distinct cash flows and labor costs.

```python
# models/finance.py

class Transaction(Base):
    id: UUID
    project_id: UUID
    type: Enum("CLIENT_PAYMENT", "VENDOR_PAYMENT", "LABOR_PAYMENT", "MISC_EXPENSE")
    amount: Decimal
    reference_id: str (Bank Ref / Check No)
    proof_url: str (Image upload of receipt)
    
class LaborTeam(Base):
    id: UUID
    name: str (e.g., "Carpentry A")
    supervisor_id: UUID
    rate_type: Enum("DAILY", "CONTRACT")
    default_daily_rate: Decimal

class LaborLog(Base):
    id: UUID
    project_id: UUID
    team_id: UUID
    date: Date
    workers_count: int
    hours_worked: float
    calculated_cost: Decimal
    notes: str

```

---

## API Endpoints & Business Logic (Service Layer)
### 1. API Design Philosophy

* **RESTful Standards:** Use standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
* **Service Pattern:** Controllers (Routes) should contain **zero** business logic. They simply call a `Service` class. This makes testing easier.
* **Dependency Injection:** Use FastAPI's `Depends` for Database sessions and User Authentication.

### 2. Authentication & Authorization (The Gatekeeper)

We use `OAuth2` with `Password Flow` and `JWT`.

**Middleware Logic:**
Every protected endpoint must verify:

1. Is the token valid?
2. Does the user have the required `Role`?

```python
# app/core/security.py

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # 1. Decode Token
    # 2. Fetch User from DB
    # 3. Return User or Raise 401
    pass

def role_required(allowed_roles: List[str]):
    def dependency(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        return user
    return dependency

```

### 3. Key API Modules & Endpoints

#### **A. User & Role Management**

* `POST /auth/token` - Login (Returns Access + Refresh Token).
* `POST /users/create` - **[Admin Only]** Create internal staff (BDE, Sales, Managers).
* `GET /users/me` - Get current profile.

#### **B. CRM (Leads & Quotes)**

* `POST /leads` - Create a new lead.
* `POST /quotes` - Create a Quotation (Draft).
* *Logic:* Accepts nested JSON (Rooms -> Items).


* `POST /quotes/{id}/finalize` - Freezes a Draft into a Version (v1).
* `POST /quotes/{id}/send` - Generates PDF & Emails Client.

#### **C. Project Conversion (The "Big Bang")**

This is the most critical endpoint. It transforms a `Quotation` into a `Project`.

* `POST /projects/convert/{quote_id}`
* **Input:** Signed Quote ID.
* **Action:**
1. Verify Quote is "ACCEPTED".
2. Create `Project` record.
3. **Auto-Generate** 6 Standard Sprints (with calculated dates).
4. Create initial `Wallet` for client.





#### **D. Financial Guardrails**

* `GET /projects/{id}/financial-health`
* **Output:** `{ "total_received": 50000, "total_spent": 45000, "balance": 5000, "can_spend_more": True }`


* `POST /payments/topup` - Client adds money.

### 4. Critical Business Logic Snippets

The coding agent must implement these specific logic blocks in the `services/` folder.

#### **Logic Block 1: The "Sprint Generator"**

When a project is created, we don't just make an empty project. We populate the timeline.

```python
# app/services/project_service.py

DEFAULT_SPRINTS = [
    {"name": "Sprint 1: Design & 3D", "days": 10},
    {"name": "Sprint 2: Civil & Demolition", "days": 15},
    {"name": "Sprint 3: Electrical & Plumbing", "days": 10},
    {"name": "Sprint 4: Carpentry & False Ceiling", "days": 25},
    {"name": "Sprint 5: Painting & Finishing", "days": 12},
    {"name": "Sprint 6: Handover & Deep Cleaning", "days": 3},
]

async def generate_standard_sprints(project_id: UUID, start_date: date, db: AsyncSession):
    current_date = start_date
    for index, sprint_data in enumerate(DEFAULT_SPRINTS):
        end_date = current_date + timedelta(days=sprint_data["days"])
        
        new_sprint = Sprint(
            project_id=project_id,
            name=sprint_data["name"],
            sequence_order=index + 1,
            start_date=current_date,
            end_date=end_date,
            status="PENDING"
        )
        db.add(new_sprint)
        
        # Next sprint starts day after this one ends
        current_date = end_date + timedelta(days=1) 
    
    await db.commit()

```

#### **Logic Block 2: The "Spending Lock"**

Before any Material Purchase or Labor Payment is recorded, this check must pass.

```python
# app/services/finance_service.py

async def validate_spending_power(project_id: UUID, amount_needed: Decimal, db: AsyncSession):
    project = await get_project_financials(project_id, db)
    
    current_balance = project.total_received - project.total_spent
    
    if current_balance < amount_needed:
        raise HTTPException(
            status_code=402, 
            detail=f"Insufficient Project Funds. Balance: {current_balance}, Required: {amount_needed}. Please request Client Top-up."
        )
    return True

```

#### **Logic Block 3: Inventory Deduction**

* **General Stock:** Deduct immediately from `Item.current_stock`.
* **Project Specific:** Do *not* touch `Item.current_stock`. Mark `PurchaseOrder` as `DELIVERED_TO_SITE`.

### 5. Swagger/OpenAPI Structure

We will group endpoints using tags in `FastAPI` to keep the auto-generated docs clean.

* `tags=["Auth"]`
* `tags=["Inventory"]`
* `tags=["Sales Pipeline"]`
* `tags=["Project Execution"]`
* `tags=["Finance"]`

---
## Frontend Architecture & Client-Side Logic

### 1. Next.js App Router Structure

We will strictly follow the "Route Groups" pattern to separate distinct layouts (e.g., Admin Dashboard vs. Client Portal).

```text
/frontend/app
├── layout.tsx                  # Root Layout (Providers: Auth, QueryClient, Toaster)
├── (auth)                      # Public Routes (No Sidebar)
│   ├── login/page.tsx
│   └── forgot-password/page.tsx
│
├── (dashboard)                 # Protected Routes (Sidebar + Header)
│   ├── layout.tsx              # AuthGuard + Dashboard Shell
│   ├── page.tsx                # Redirects based on Role
│   │
│   ├── admin                   # Role: SUPER_ADMIN
│   │   ├── users/page.tsx
│   │   ├── inventory/page.tsx
│   │   └── vendors/page.tsx
│   │
│   ├── sales                   # Role: BDE, SALES
│   │   ├── leads/page.tsx
│   │   ├── quotes/
│   │   │   ├── [id]/builder.tsx  # The Complex Quote Builder
│   │   │   └── page.tsx
│   │
│   ├── projects                # Role: MANAGER, SUPERVISOR
│   │   ├── [id]/
│   │   │   ├── overview/page.tsx
│   │   │   ├── finance/page.tsx
│   │   │   └── sprints/page.tsx
│   │
│   └── client-portal           # Role: CLIENT
│       ├── [projectId]/page.tsx
│       └── payments/page.tsx

```

### 2. State Management Strategy

We avoid "Prop Drilling" by using two distinct libraries:

* **Server State (Data):** `TanStack Query (React Query)`
* Used for fetching Leads, Projects, Inventory.
* **Why?** Handles caching, background refetching, and loading states automatically.
* *Example:* `useQuery(['project', id], fetchProject)`


* **Client State (UI):** `Zustand`
* Used for Sidebar toggle, User Session, Quotation Draft (temporary local edits).
* **Why?** Lightweight, no boilerplate.



### 3. The "Quotation Builder" (Complex UI)

This is the most critical UI component. It must handle nested arrays (Rooms -> Items) dynamically.

**Tech Stack:** `React Hook Form` + `zod` + `useFieldArray`

**Logic Flow:**

1. **Master Source:** Fetch `Items` from API (Base Price, Name).
2. **User Action:**
* Click "Add Room" (e.g., "Kitchen").
* Inside "Kitchen", click "Add Item".
* Select "Plywood 18mm" from Dropdown.


3. **Auto-Calculation:**
* Input `Quantity` (e.g., 50 sqft).
* System looks up `Base Price` ($100).
* System applies `Markup` (User input, default 20%).
* `Final Price` = $100 * 50 * 1.2 = $6000.
* **Updates Live** in the "Total Quote Value" sticky footer.



```typescript
// types/quotation.ts
interface QuoteFormValues {
  client_id: string;
  rooms: {
    name: string;
    items: {
      item_id: string;
      quantity: number;
      markup: number; 
    }[];
  }[];
}

```

### 4. API Integration Layer

We will create a centralized `axios` instance with interceptors to handle JWT tokens automatically.

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request Interceptor
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token; // Get from Zustand
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor (Auto-Logout on 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```

### 5. Role-Based Access Control (RBAC) - Client Side

We need a Higher-Order Component (HOC) or wrapper to protect specific views.

```typescript
// components/auth/RoleGuard.tsx
export default function RoleGuard({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode, 
  allowedRoles: string[] 
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) return <LoadingSpinner />;

  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDeniedScreen />; // Or redirect
  }

  return <>{children}</>;
}

```

---

# 🏗️ Interior Design ERP - Master Execution Plan

## Page 5: Inventory & Vendor Management Implementation

### 1. The Inventory Strategy

We must handle two distinct types of procurement flows. The coding agent must implement separate logic paths for these:

* **Type A: General Stock (Warehouse):** Items bought in bulk (e.g., Cement, Adhesives, Screws) and stored. They are "issued" to projects later.
* **Type B: Project-Specific (Direct-to-Site):** Items bought specifically for a client (e.g., a specific designer Chandelier, Italian Marble slab). These never enter the "Warehouse Count" but their cost is immediately booked to the Project.

### 2. Database Model Refinement: Stock Transaction Log

To track *when* and *why* stock changed, we need an immutable ledger. Do not just update `current_stock` in the `Item` table; append a row here first.

```python
# models/inventory.py

class StockTransaction(Base):
    id: UUID
    item_id: UUID
    quantity: float      # Positive for Add, Negative for Deduct
    transaction_type: Enum("PURCHASE_IN", "PROJECT_ISSUE", "DAMAGED", "RETURNED")
    
    reference_id: UUID   # PO ID or Project ID
    performed_by: UUID   # User ID
    timestamp: DateTime
    
    # Financial Impact
    unit_cost_at_time: Decimal # Capture cost at this specific moment

```

### 3. Purchase Order (PO) Workflow Logic

The PO system is the trigger for restocking.

**Endpoint:** `POST /inventory/purchase-orders`
**Logic:**

1. **Draft:** Admin selects Vendor + Items.
2. **Project Tagging:**
* If `is_project_specific = True`, the UI *forces* the user to select a `Project`.
* If `is_project_specific = False`, the `Project` field is disabled.


3. **Approval/Send:** PO is converted to PDF (using `WeasyPrint`) and emailed to Vendor.
4. **Receiving (The GRN - Goods Received Note):**
* When goods arrive, Admin clicks "Receive".
* *System Action:*
* If **General**: `Item.current_stock += qty`. Create `StockTransaction(+qty)`.
* If **Project-Specific**: `Item.current_stock` (No Change). Create `Expense` record linked to `Project`.





### 4. Bill Management & Price Updates

Vendors send bills *after* delivery. We need to reconcile the PO price with the actual Bill price.

**Endpoint:** `POST /inventory/bills/upload`
**Input:** `vendor_id`, `po_id`, `final_amount`, `file` (Image/PDF).

**Business Logic (Price Adjustment):**

* *Scenario:* PO said Item A costs $10. Bill says $12.
* *Action:* The system must update the `Item.base_price` (Moving Average or Last Purchase Price) in the Master Database so future quotes use the accurate $12 price.
* *Alert:* If the variance is > 10%, trigger a "Price Alert" to the Manager.

### 5. Frontend Components (Next.js)

#### **A. The Master Inventory Grid (`/admin/inventory`)**

* **Tech:** `TanStack Table` (React Table).
* **Columns:** Name, Category, SKU, Current Stock, Reorder Level, Base Price, "Actions".
* **Visuals:**
* Row highlights Red if `Current Stock < Reorder Level`.
* "Quick Add" button to generate a generic PO for all low-stock items.



#### **B. The "Material Indent" Request (Supervisor View)**

Supervisors on site don't buy; they *request*.

* **View:** `/projects/{id}/indent`
* **Form:** Select Item  Quantity  Submit.
* **Backend Result:** Creates a `MaterialRequest`.
* Manager approves  Warehouse issues stock (stock -10)  Project cost increases.



### 6. Vendor Dashboard (Internal)

A simple view for Admins to see which vendors are performing well.

* **Metrics:**
* *Total Spend:* Sum of all finalized POs.
* *Reliability:* (On-time deliveries / Total deliveries).



---


## Project Management, Sprint Logic & Timeline Visualization

### 1. The Core Concept: "Standardized Execution"

Unlike generic project management tools (Jira/Trello), this system enforces a **strict interior design workflow**. We presume every project follows a standard 6-stage lifecycle, but dates are dynamic based on site conditions.

### 2. The "Standard 6 Sprints" Configuration

The coding agent should define these constants in `app/core/config.py`. These are the blueprints used to auto-generate the project schedule.

| Sprint Order | Stage Name | Default Duration | Dependencies | Key Deliverables |
| --- | --- | --- | --- | --- |
| **1** | **Design & Approvals** | 10 Days | None | 2D Layouts, 3D Renders, Material Selection. |
| **2** | **Civil & Demolition** | 15 Days | Sprint 1 | Wall breaking, Debris removal, Flooring base. |
| **3** | **MEP (Mech, Elec, Plumb)** | 10 Days | Sprint 2 | Wiring, Piping, AC Ducts. |
| **4** | **Woodwork & Carpentry** | 25 Days | Sprint 3 | Wardrobes, Kitchen Cabinets, False Ceiling framing. |
| **5** | **Finishing & Painting** | 12 Days | Sprint 4 | Laminates, Paint coats, Electrical fittings. |
| **6** | **Handover & Snag List** | 5 Days | Sprint 5 | Deep cleaning, Final inspection, Key handover. |

### 3. Backend Logic: The Dependency Engine

When a project is created, the system must not only create sprints but link them. If Sprint 1 is delayed by 2 days, Sprints 2-6 must shift automatically.

**Algorithm:** `Ripple Date Update`

* **Trigger:** Manager updates `end_date` of Sprint .
* **Action:**
1. Calculate `delay = new_end_date - old_end_date`.
2. Find all Sprints where `dependency_sprint_id == Sprint N`.
3. Update their `start_date += delay` and `end_date += delay`.
4. Recursively repeat for subsequent sprints.



### 4. Frontend Component: The Timeline (Gantt View)

We will use `gantt-task-react` for a lightweight, interactive timeline in Next.js.

**Location:** `/projects/[id]/timeline`

* **View Mode (Client):** Read-only. Shows "Planned" vs "Actual" progress bars.
* **Edit Mode (Manager):**
* **Drag-and-Drop:** Dragging a bar's right edge extends the duration.
* **API Call:** `PATCH /projects/{id}/sprints/{sprint_id}` with new dates.
* **Visual Feedback:** When dropped, the UI optimistically updates dependent sprints (moves them right) while the API saves in the background.



### 5. Daily Progress Tracking (The "Site Feed")

Supervisors need a mobile-friendly view to log daily work. This replaces WhatsApp groups.

**Endpoint:** `POST /projects/{id}/daily-logs`
**Payload:**

* `sprint_id`: UUID
* `notes`: "Completed wardrobe carcass in Master Bedroom."
* `images`: [List of URLs] (Uploaded to AWS S3/Cloudinary)
* `blockers`: "Cement shortage", "Client changed design".

**UI Implementation:**

* **Mobile View:** A simple form: "What did you do today?" + Camera Access.
* **Feed View:** A vertical timeline (like Instagram) showing logs day-by-day.
* *Client Visibility:* Managers can toggle a `visible_to_client` boolean on specific logs to hide internal messes (e.g., "Worker broke a tile").



### 6. Handling Variation Orders (VO) in Timeline

If a VO adds significant work (e.g., "Add False Ceiling in Guest Room" - originally not planned), it impacts the schedule.

* **Logic:** When a VO is approved, the Manager must manually map it to a Sprint.
* **System Prompt:** "This VO is linked to 'Sprint 4: Carpentry'. Do you want to extend Sprint 4 by X days?"
* **Result:** The Gantt chart expands, and the final Handover Date is pushed back.

---

## Financial Architecture & The "Project Wallet"

### 1. The Core Concept: "The Project Wallet"

Every project acts as a distinct financial entity (a "Wallet"). We do not pool money into one big company account in the logic; we track it per project.

**The Golden Formula:**


**The Guardrail:**
If a Manager attempts to approve a Purchase Order (PO) or Labor Payment where , the system **rejects** the action with a `402 Payment Required` error.

### 2. Database Model Refinement: The Financial Ledger

We need a double-entry style ledger to ensure no money goes missing.

```python
# models/finance.py

class ProjectWallet(Base):
    project_id: UUID (PK)
    total_agreed_value: Decimal  # Original Quote + Approved VOs
    total_received: Decimal
    total_spent: Decimal
    current_balance: Decimal     # Calculated field (cached)
    last_updated: DateTime

class Transaction(Base):
    id: UUID
    project_id: UUID
    
    # Classification
    category: Enum("INFLOW", "OUTFLOW")
    source: Enum("CLIENT", "VENDOR", "LABOR", "PETTY_CASH")
    
    amount: Decimal
    description: str
    
    # Linkage (Polymorphic-like behavior)
    related_po_id: UUID (Nullable)
    related_labor_log_id: UUID (Nullable)
    related_vo_id: UUID (Nullable)
    
    # Audit
    recorded_by: UUID (User)
    proof_doc_url: str (S3 Link)
    status: Enum("PENDING", "CLEARED", "REJECTED")

```

### 3. "Money In": Client Payment Workflow

Clients pay in milestones (e.g., 20% Advance, 30% after Flooring).

**A. Manual Entry (Bank Transfer/Cheque)**

* **User:** Sales/Manager.
* **Action:** Upload screenshot of Transaction Ref.
* **System:** Creates `Transaction(INFLOW, PENDING)`.
* **Approval:** Finance Admin must click "Verify" to credit the Wallet.

**B. Payment Gateway (Razorpay/Stripe)**

* **User:** Client (via Client Portal).
* **Action:** Clicks "Pay Milestone 1".
* **System:** Webhook receives success  Auto-creates `Transaction(INFLOW, CLEARED)`  Auto-updates Wallet.

### 4. "Money Out": The Expense Engine

Expenses come from three sources. The coding agent must implement logic for each:

**Source A: Vendor Purchase Orders (Material)**

* *Trigger:* PO status changes to "DELIVERED".
* *Action:* System creates `Transaction(OUTFLOW, VENDOR)`.
* *Logic:* If `PO.is_project_specific` is True, deduct from Project Wallet. If False (General Stock), deduct from Company Overhead (different wallet).

**Source B: Labor Payouts**

* *Trigger:* Weekly Payout Generation.
* *Action:* Sum of `LaborLog` hours for the week  Rate.
* *Logic:* Deduct from Project Wallet.

**Source C: Petty Cash (Site Expenses)**

* *Trigger:* Supervisor uploads photo of bill (Tea, Transport, Diesel).
* *Action:* Manager approves  Deduct from Wallet.

### 5. The "Spending Lock" Implementation (Middleware)

This is the most critical business logic in the entire ERP.

```python
# services/finance_service.py

async def authorize_expense(project_id: UUID, amount: Decimal, db: AsyncSession):
    wallet = await get_wallet(project_id, db)
    
    # Reserve funds for "Pending" POs that aren't paid yet? 
    # Yes, simplified Conservative Logic:
    effective_balance = wallet.total_received - (wallet.total_spent + wallet.pending_approvals)
    
    if effective_balance < amount:
        raise InsufficientFundsException(
            current=effective_balance, 
            required=amount,
            message="Project funds exhausted. Request Top-up from Client."
        )
    return True

```

### 6. Profitability Dashboard (Real-Time)

Managers need to see if they are burning cash too fast.

**Visuals (Recharts/Chart.js):**

1. **Burn Rate Chart:** Line graph of `Spend` vs `Time`. If the slope is steeper than the `Project Progress` slope, alert the Manager.
2. **The "Red Zone":**
* *Total Quote:* $10,000.
* *Estimated Cost:* $7,000 (30% Margin).
* *Alert:* If `Total Spent` crosses $7,000 and project is only 80% done, the project is officially **Loss-Making**. Flash UI in Red.



### 7. Variation Orders (VO) - Financial Impact

When a client asks for "Extra Wardrobe" ($1,000):

1. **Create VO:** Status `REQUESTED`.
2. **Client Pays:** Status `PAID`.
3. **Wallet Update:** `Total_Agreed_Value += 1000`, `Total_Received += 1000`.
4. **Result:** Now the Manager can spend that extra $1,000 on materials. **Strict Rule:** VO work cannot start until VO payment is received.

---

## Labor Management, Attendance & Payroll Logic

### 1. The Core Challenge: "Ghost Labor"

In interior projects, labor is often the biggest variable cost. Supervisors might claim 5 workers were present when only 3 were working.
**Solution:** A strict "Digital Attendance" system linked to specific Sprints.

### 2. Labor Models & Hierarchy

We need to distinguish between casual daily wage workers and skilled contract teams.

```python
# models/labor.py

class LaborTeam(Base):
    id: UUID
    name: str (e.g., "Roy's Painting Crew")
    leader_name: str
    contact_number: str
    specialization: Enum("CIVIL", "CARPENTRY", "PAINTING", "ELECTRICAL")
    
    # Billing Type
    payment_model: Enum("DAILY_WAGE", "CONTRACT_FIXED")
    default_daily_rate: Decimal (Per head, e.g., 800 INR)
    
class Worker(Base):
    id: UUID
    team_id: UUID
    name: str
    skill_level: Enum("HELPER", "SKILLED", "FOREMAN")
    daily_rate: Decimal (Override team rate if needed)

class AttendanceLog(Base):
    id: UUID
    project_id: UUID
    sprint_id: UUID (Links cost to specific phase)
    team_id: UUID
    date: Date
    
    workers_present: int
    total_hours: float
    
    # Financials
    calculated_cost: Decimal
    status: Enum("PENDING", "APPROVED_BY_MANAGER", "PAID")
    
    # Proof
    site_photo_url: str (Must show the team)

```

### 3. The Supervisor's "Daily Log" Workflow

The Supervisor app (Mobile View) is the primary data entry point.

**Endpoint:** `POST /labor/attendance`
**Logic:**

1. **Select Project:** "Villa 402".
2. **Select Team:** "Carpentry Team A".
3. **Input:**
* *Headcount:* 4 Skilled, 2 Helpers.
* *Work Done:* "Completed Guest Room Wardrobe framing."
* *Photo:* Mandatory upload of the team on site.


4. **System Calculation:**
* .
* **Status:** `PENDING`.



### 4. The Manager's "Weekly Payroll" Dashboard

Managers don't pay daily; they pay weekly (usually Saturdays).

**View:** `/admin/payroll`
**Logic:**

1. **Filter:** Select "Week of Feb 10 - Feb 16".
2. **Grouping:** Group pending `AttendanceLogs` by `Team`.
3. **Review:**
* Manager sees: "Villa 402: 6 days  6400 = 38,400".
* *Action:* Click "Approve & Generate Payout".


4. **Financial Trigger:**
* System creates a `Transaction(OUTFLOW, LABOR)` in the **Project Wallet**.
* *Check:* Does the Project Wallet have 38,400?
* *If Yes:* Mark logs as `PAID`.
* *If No:* Reject with "Insufficient Funds".



### 5. Contract Labor (The Alternative Flow)

For teams paid on "Work Completion" (e.g., Square Feet basis), attendance is for record-keeping only, not billing.

**Workflow:**

1. **Contract:** "False Ceiling @ $45/sqft for 1000 sqft". Total = $45,000.
2. **Milestone 1:** "Framing Complete (50%)".
3. **Supervisor Action:** "Raise Bill for 50% Completion".
4. **Manager Action:** Verify on site  Approve $22,500 payout.
5. **Logic:** This debits the Project Wallet just like a material purchase.

### 6. Performance Analytics (The "Speed" Metric)

We can now measure team efficiency.

* **Metric:** `Cost per SqFt` vs `Time Taken`.
* **Insight:** "Carpentry Team A takes 15 days for a kitchen but costs $500/day. Team B takes 10 days but costs $800/day."
* **Result:** System recommends Team B for urgent projects.

---

## Document Generation (PDFs) & Notification System

### 1. The Document Engine: `WeasyPrint` + `Jinja2`

We need pixel-perfect PDFs for Quotations, Purchase Orders (POs), and Invoices. We will **not** use report builders; we will use HTML/CSS templates converted to PDF.

**Tech Stack:**

* **Renderer:** `WeasyPrint` (Python).
* **Templating:** `Jinja2` (To inject data into HTML).
* **Styling:** CSS (Support for `@page` media types for A4 formatting).

#### **Workflow Logic (The Pipeline):**

1. **Trigger:** User clicks "Download Quote PDF".
2. **Data Fetch:** Service fetches `Quotation` + `Client` + `Items` + `CompanySettings` (Logo, GST No).
3. **Render:** Jinja2 renders `templates/quote_v1.html` with this data.
4. **Convert:** WeasyPrint converts HTML string  PDF bytes.
5. **Action:** Return `StreamingResponse` (Download) OR Upload to S3 (Archive).

### 2. Critical Document Templates

The coding agent must create these HTML templates in `app/templates/`.

#### **A. The Client Quotation (The "Sales Pitch")**

* **Cover Page:** Project Name, Client Name, 3D Render (Cover Image), Total Estimated Cost.
* **Summary Table:** Room-wise totals (e.g., "Kitchen: $5,000", "Master Bed: $3,000").
* **Detailed Breakdown:**
* *Header:* Room Name.
* *Table:* Item Name | Description | Image (Thumbnail) | Qty | Unit Price | Total.


* **Payment Schedule:** Auto-calculated (e.g., "20% Advance: $X", "40% Before Carpentry: $Y").
* **Terms:** Standard legalese.

#### **B. The Purchase Order (For Vendors)**

* **Header:** Vendor Details, PO Number, Date.
* **Table:** Item SKU | Name | Qty | Target Delivery Date.
* **Footer:** "Authorized Signatory" (Digital Signature of Admin).

#### **C. The Tax Invoice**

* **Format:** Strict GST/VAT compliance.
* **Columns:** HSN/SAC Code, Taxable Value, CGST, SGST, Total.

### 3. Notification Architecture (In-App & Email)

We need a unified notification center so BDEs don't miss leads and Managers don't miss approvals.

#### **Database Schema: Notifications**

```python
# models/notification.py

class Notification(Base):
    id: UUID
    recipient_id: UUID (User)
    type: Enum("ALERT", "APPROVAL_REQ", "INFO", "PAYMENT_RECEIVED")
    title: str
    body: str
    
    # Navigation
    action_url: str (e.g., "/projects/123/approvals")
    
    is_read: bool = False
    created_at: DateTime

```

#### **Real-Time Delivery (Polling vs. Sockets)**

For a production MVP, **Polling** (every 30s) via `TanStack Query` is robust and simpler than managing WebSocket connections.

* **Frontend Hook:** `useNotifications()` fetches unread count every 60s.
* **UI:** Bell Icon in Top Navbar shows Red Badge.

### 4. Email System (`FastAPI-Mail`)

We will use **Background Tasks** so the API doesn't hang while sending emails.

**Triggers & Templates:**

1. **New Lead Assigned:** To Sales Person.
* *Subject:* "New Lead: [Name] - [Location]"


2. **Quote Sent:** To Client.
* *Attachment:* The generated PDF.
* *Button:* "View & Approve Online".


3. **Approval Needed:** To Manager.
* *Subject:* "Purchase Order #PO-999 requires approval ($5,000)".


4. **Payment Received:** To Client & Finance.
* *Subject:* "Payment Receipt: Transaction #TXN-888".



```python
# app/core/email.py

async def send_email_background(
    background_tasks: BackgroundTasks,
    subject: str,
    email_to: str,
    template_name: str,
    template_data: dict,
    file_path: str = None
):
    # Logic to render template and attach file
    message = MessageSchema(...)
    background_tasks.add_task(fm.send_message, message)

```

### 5. File Storage (Digital Asset Management)

We cannot store PDFs or Site Photos on the server disk (it breaks in cloud scaling). We must use **S3-compatible storage** (AWS S3, Google Cloud Storage, or MinIO).

**Folder Structure (Bucket Strategy):**

* `/static/items/` - Inventory Item Images (Public Read).
* `/projects/{project_id}/quotes/` - Generated PDF archives (Private).
* `/projects/{project_id}/site_photos/{sprint_id}/` - Daily progress uploads (Private).
* `/finance/receipts/` - Payment proofs (Restricted Access).

**Upload Logic:**

* Frontend uploads directly to S3 via **Presigned URLs** (Secure, saves backend bandwidth) OR Frontend sends to Backend  Backend uploads to S3 (Simpler for MVP).
* *Recommended:* Backend proxy upload for simpler permission handling initially.

---

## Deployment, CI/CD & Final Handover

### 1. Production Infrastructure Strategy

We will use **Docker Compose** for a unified, portable production deployment. This ensures the coding agent's local environment matches production exactly.

**Architecture:**

* **Reverse Proxy:** `Nginx` (Handles HTTPS, Gzip, and routing /api requests to Backend and others to Frontend).
* **Application Server:** `Uvicorn` (FastAPI) running behind Nginx.
* **Frontend Server:** `Next.js` (Node.js) running in standalone mode.
* **Database:** `PostgreSQL 16` (Dockerized, with a mounted volume for persistence).
* **Object Storage:** AWS S3 (or MinIO for self-hosted).

### 2. The `docker-compose.prod.yml` Blueprint

The coding agent must create this file. It defines the production state.

```yaml
version: '3.8'

services:
  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: int_design_erp

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    env_file: .env
    depends_on:
      - db
    restart: always

  frontend:
    build: ./frontend
    env_file: .env.production
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./certbot/conf:/etc/letsencrypt
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:

```

### 3. CI/CD Pipeline (GitHub Actions)

Automate the testing and deployment to prevent breaking the build.

**Workflow: `.github/workflows/main.yml**`

1. **Lint & Test:**
* Run `black --check` and `ruff` (Python Linting).
* Run `npm run lint` (Frontend Linting).
* Run `pytest` (Backend Unit Tests).


2. **Build Docker Images:**
* If tests pass, build `backend:latest` and `frontend:latest`.
* Push to Container Registry (GHCR or Docker Hub).


3. **Deploy (SSH):**
* SSH into the Production VPS.
* `docker-compose pull`
* `docker-compose up -d` (Zero downtime update).



### 4. Monitoring & Logs (Observability)

Once live, you need to know *if* it breaks and *why*.

* **Error Tracking:** `Sentry`.
* Add Sentry SDK to FastAPI (`sentry_sdk.init(...)`).
* Add Sentry SDK to Next.js (`sentry.config.js`).
* *Result:* Real-time alerts on Slack when a user hits a 500 error.


* **Structured Logging:**
* Configure Python `logging` to output JSON.
* Why? Easier to parse in cloud log viewers (AWS CloudWatch / Datadog).



### 5. "Day 1" Initialization Checklist

The coding agent must execute these steps **immediately** after the first deployment.

1. **Database Migration:** Run `alembic upgrade head` to create all tables.
2. **Seed Super Admin:** Run a script `python app/initial_data.py` to create the first user (`admin@company.com`).
3. **Seed Enums:** Populate the "Standard 6 Sprints" and "Inventory Categories" into the DB so the dropdowns aren't empty.
4. **SMTP Verification:** Send a test email to ensure the Mailing system isn't blocked by spam filters.
5. **Backup Schedule:** Configure a Cron Job on the host machine to dump the Postgres DB every 6 hours and upload to S3 (`pg_dump | aws s3 cp`).

### 6. Security Hardening

* **CORS:** Restrict `allow_origins` strictly to your frontend domain.
* **Rate Limiting:** Use `FastAPI-Limiter` (Redis-backed) to prevent brute-force attacks on `/login`.
* **SSL:** Mandatory. Use Certbot for free auto-renewing certificates.

