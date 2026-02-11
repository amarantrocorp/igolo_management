# Implementation Plan: Beautiful Quote Experience & Project Conversion

## Goal
Transform the Quotation module into a professional, high-fidelity experience, close the loop by enabling "Convert to Project", and enforce business logic to prevent redundant quotes.

## Architecture

### 1. Shared Foundation
- **Types** (`frontend/types/quote.ts`): Shared definitions.
- **Component** (`frontend/components/sales/quote-preview.tsx`): The "Source of Truth" for visual representation.

### 2. Lead Management & History (NEW)
- **Lead Details Page** (`/dashboard/sales/leads/[id]`):
    - **Header**: Lead info, Status, Assigned User.
    - **Tabs**:
        - **Overview**: Basic info, notes.
        - **Quotations (Sequential View)**: A timeline of all quotes sent to this lead, ordered by version/date.
            - **Cards**: Each quote card shows Version, Amount, Status, Date.
            - **Actions**: View, Print, etc.
    - **Logic**: If a Lead has a `CONVERTED` status or an active Project, the "Create New Quote" button is **DISABLED** with a tooltip explaining why.

### 3. Quote Creation (`/quotes/new`)
- **Pre-check**: When selecting a Lead, check if they are already converted.
    - **Alert**: If converted, show "Project already exists for this client" and block creation.
- **Split Screen**: Left (Form) | Right (Real-time Preview).

### 4. Quote View & Actions (`/quotes/[id]`)
- **View Mode**:
    - High-fidelity `QuotePreview`.
    - **Actions**: Edit, Print, Download.
    - **"Convert to Project"**: (Visible ONLY if status is `APPROVED` and no project exists).

### 5. Project Conversion Workflow
- **Trigger**: "Convert to Project" button.
- **Action**: `POST /api/v1/projects/convert/{quote_id}`.
- **Post-Action**:
    - Project created.
    - Lead status updated to `CONVERTED`.
    - Quote creation locked for this Lead.

## Implementation Steps

### Phase 1: Foundation & Types
1.  **Types**: Create `frontend/types/quote.ts`.
2.  **Preview**: Build `QuotePreview` component.

### Phase 2: Lead Details & History (NEW)
1.  **Page**: Create `/dashboard/sales/leads/[id]/page.tsx`.
2.  **Timeline**: Implement `QuoteHistoryTimeline` component.
3.  **Locking**: Add conditional logic to disable "New Quote" if lead is converted.

### Phase 3: Quote Creation & View
1.  **Create Page**: Split screen flow + Validation to block converted leads.
2.  **View Page**: View/Edit modes + "Convert to Project" button.

### Phase 4: Conversion Logic
1.  **API**: Ensure `convert_quote_to_project` updates Lead status to `CONVERTED`.
2.  **Frontend**: specific checks for this status.

## Task List
- [ ] Create `frontend/types/quote.ts`.
- [ ] Implement `QuotePreview` component.
- [ ] Implement `LeadDetailsPage` with Quote History Timeline.
- [ ] Implement "Quote Creation Lock" logic (Frontend & Backend).
- [ ] Refactor `quotes/new` and `quotes/[id]`.
- [ ] Implement "Convert to Project" workflow.
