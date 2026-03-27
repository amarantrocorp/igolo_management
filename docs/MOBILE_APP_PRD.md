# Igolo Interior ERP -- Mobile App Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-03-25
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-03-25

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas & Their Mobile Needs](#2-user-personas--their-mobile-needs)
3. [App Architecture Overview](#3-app-architecture-overview)
4. [Role-Based Tab Navigation](#4-role-based-tab-navigation)
5. [Screen-by-Screen Specification](#5-screen-by-screen-specification)
6. [Offline-First Features](#6-offline-first-features)
7. [Push Notification Strategy](#7-push-notification-strategy)
8. [Mobile-Specific UX Patterns](#8-mobile-specific-ux-patterns)
9. [Design System](#9-design-system)
10. [API Endpoints Used Per Screen](#10-api-endpoints-used-per-screen)
11. [Performance Targets](#11-performance-targets)
12. [Release Strategy](#12-release-strategy)
13. [App Store Metadata](#13-app-store-metadata)

---

## 1. Executive Summary

### 1.1 Why a Mobile App?

The Igolo Interior ERP web application manages the complete interior design project lifecycle from Lead through Quotation, Conversion, Execution, and Handover. However, four critical operational gaps exist that only a native mobile experience can address:

**Site supervisors live on construction sites.** They spend 8+ hours daily on-site where laptops are impractical. They need to mark attendance, upload site photos, log daily progress, and request materials directly from their phone -- not via WhatsApp groups that lose context.

**Sales representatives are always moving.** They meet clients, visit sites, and attend events. Capturing lead information must happen immediately after a meeting, not hours later when they return to their desk. Sharing quotation PDFs via WhatsApp from within the app eliminates copy-paste workflow.

**Clients expect real-time visibility.** Busy professionals check project status in the evening from their couch. A dedicated mobile experience with a photo feed, timeline view, and one-tap payments removes the friction of calling the designer for updates.

**Managers need to approve on the fly.** Purchase orders, quotations, payroll batches, and material requests all stall when the manager is in meetings. Push notifications with one-tap approve/reject keep the business moving.

### 1.2 Technical Foundation

- **Target Platforms:** iOS 15+ and Android 12+ via React Native (Expo SDK 52+)
- **Backend API:** The existing FastAPI backend at `/api/v1/` serves all data. Zero new endpoints required for MVP. The mobile app is a pure API consumer.
- **Authentication:** Same OAuth2 JWT flow (access + refresh tokens). Same RBAC enforcement. The mobile app stores tokens in secure storage (expo-secure-store).
- **Multi-tenancy:** The app supports the existing multi-org architecture. Users with multiple org memberships can switch organizations within the app. Login is scoped to the tenant subdomain (slug-based).

### 1.3 What This Document Covers

This PRD is the single source of truth for the React Native development team. It covers every screen, every interaction, every API call, every edge case, and every offline behavior. A developer should be able to build the entire app from this document without asking a single clarifying question.

### 1.4 What This Document Does NOT Cover

- Backend API changes (none required for MVP)
- Web application changes
- Infrastructure/DevOps for the mobile app CI/CD pipeline
- App monetization strategy

---

## 2. User Personas & Their Mobile Needs

### 2.1 Persona 1: Ravi (Sales Executive)

**Role:** SALES or BDE
**Age:** 26
**Tech comfort:** High -- uses smartphone for everything
**Work pattern:** Out of office 60% of the time meeting clients, attending property expos, doing site visits

**Daily workflow:**
- Morning: Check CRM for today's follow-ups and new lead assignments
- Mid-day: Meet 2-3 potential clients, capture contact info immediately after each meeting
- Afternoon: Create rough quotation for a recent site visit, share PDF draft with the client via WhatsApp
- Evening: Log call notes, update lead statuses, check if manager approved a pending quotation

**Key mobile needs:**
1. Quick lead capture (under 30 seconds from launch to saved lead)
2. Log activity notes after calls/meetings with optional voice-to-text
3. View and share quotation PDFs directly via WhatsApp/Email
4. See real-time pipeline of leads by status (Kanban-style)
5. Receive push notification when a quotation is approved/rejected by manager

**Current pain point:** Ravi writes lead info on paper or in a personal notes app, then re-enters it into the web ERP when he's back at his desk. By then he's forgotten details. Some leads fall through the cracks entirely.

**Success metric:** Time from client meeting to lead entry drops from 4 hours to under 2 minutes.

---

### 2.2 Persona 2: Priya (Project Manager)

**Role:** MANAGER
**Age:** 34
**Tech comfort:** High
**Work pattern:** Juggles 5-8 active projects, always in meetings or on calls, rarely sits at a desk for more than 30 minutes

**Daily workflow:**
- Morning: Review overnight notifications -- new payments received, daily logs submitted, material requests pending
- Mid-day: Approve or reject pending items (POs, quotation status changes, payroll batches)
- Afternoon: Check project financial health across all active projects
- Evening: Review sprint progress, check if any projects are entering the "red zone" (over budget)

**Key mobile needs:**
1. Dashboard showing pending approval count, total revenue, active project count
2. One-tap approve/reject for quotations, material requests, and payroll
3. Project wallet overview (received vs. spent vs. balance) at a glance
4. Sprint timeline visualization per project
5. Push notifications for high-priority items (payment received, budget threshold crossed)

**Current pain point:** Priya's approvals are the bottleneck. A supervisor submits a material request at 10 AM but Priya doesn't see it until she opens her laptop at 6 PM. The site workers wait all day.

**Success metric:** Average approval turnaround drops from 8 hours to under 30 minutes.

---

### 2.3 Persona 3: Suresh (Site Supervisor)

**Role:** SUPERVISOR
**Age:** 40
**Tech comfort:** Medium -- comfortable with WhatsApp, basic apps
**Work pattern:** On construction site from 8 AM to 6 PM, dusty environment, phone is primary computing device

**Daily workflow:**
- 8:30 AM: Arrive at site, mark attendance for each labor team present
- 9 AM - 5 PM: Oversee work, take progress photos periodically
- 5:30 PM: Submit daily log (notes + photos + progress percentage)
- As needed: Submit material indent requests when stock runs low on-site

**Key mobile needs:**
1. Simple attendance marking -- select team, enter headcount + hours, one-tap submit
2. Camera integration for site photos (multiple photos per log entry)
3. Daily log submission with sprint picker, notes field, and photo attachments
4. Material indent request form (item picker, quantity, priority level)
5. View today's assigned project and active sprint at a glance

**Current pain point:** Suresh sends updates to a WhatsApp group with 15 people. Photos get buried, there's no structured record, and when the client asks "what happened on March 12th?" nobody can find the answer.

**Success metric:** 100% of daily logs captured digitally with photos. Zero reliance on WhatsApp for site communication.

---

### 2.4 Persona 4: Anita (Client)

**Role:** CLIENT
**Age:** 38
**Tech comfort:** High -- expects consumer-grade app quality
**Work pattern:** Busy professional, checks project status during commute or in the evening

**Daily workflow:**
- Morning commute: Quick glance at project progress ring -- "are we on track?"
- Evening: Browse through new site photos, see what work happened today
- Weekly: Check timeline to understand when carpentry will start
- Monthly: Make milestone payment via in-app Razorpay checkout

**Key mobile needs:**
1. Project progress overview (visual ring/bar showing overall completion)
2. Sprint timeline showing planned vs. actual dates
3. Photo feed (chronological, like a social media feed) of site updates visible to her
4. One-tap Razorpay payment for milestones
5. Payment history with receipt downloads

**Current pain point:** Anita has to call her designer to ask "what's happening at my house?" She gets verbal updates with no photos. She has no idea if the project is on schedule or over budget.

**Success metric:** Zero "status update" phone calls from clients. 100% payment collection through the app.

---

### 2.5 Persona 5: Vikram (Business Owner / Super Admin)

**Role:** SUPER_ADMIN
**Age:** 45
**Tech comfort:** Medium-high -- prefers dashboards and summaries over granular data
**Work pattern:** Oversees the entire business, travels between cities, checks business health from his phone

**Daily workflow:**
- Morning: Open app, check dashboard -- total revenue this month, number of active projects, pending approvals
- As needed: Approve large expenses (over threshold), review project P&L summaries
- Weekly: Check which projects are profitable, which are bleeding money
- Monthly: Review team performance, payroll totals, vendor spend

**Key mobile needs:**
1. KPI dashboard (revenue, project count, lead pipeline, margin overview)
2. Approve/reject high-value items (POs over a threshold, quotations over a value)
3. Financial health overview across all projects
4. User management basics (view team, deactivate if urgent)
5. Push notifications only for critical items (large payments, budget alerts)

**Current pain point:** Vikram has zero visibility into business health without opening his laptop and navigating through multiple web pages. He makes decisions based on gut feeling rather than data.

**Success metric:** Vikram checks the app dashboard daily and makes data-driven decisions within 60 seconds.

---

## 3. App Architecture Overview

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | React Native (Expo SDK 52+) | Single codebase for iOS + Android. Expo provides managed workflow, OTA updates, and built-in camera/file APIs. |
| Language | TypeScript (strict mode) | Type safety matches the web frontend. Shared type definitions possible. |
| Navigation | Expo Router (file-based) | Mirrors the Next.js App Router pattern used in the web app. Deep linking support built-in. |
| State (UI) | Zustand | Same library as web app. Lightweight, no boilerplate. Stores: auth, UI preferences, draft data. |
| State (Server) | TanStack Query (React Query) v5 | Same library as web app. Handles caching, background refetching, optimistic updates, pagination. |
| API Client | Axios | Same interceptor pattern as web app. JWT auto-injection, 401 auto-logout, refresh token rotation. |
| Secure Storage | expo-secure-store | JWT tokens stored encrypted. Biometric gate for sensitive data. |
| Offline Storage | @react-native-async-storage/async-storage | Draft leads, queued photo uploads, cached project data. |
| Push Notifications | expo-notifications + Expo Push Service | Backend sends push via Expo Push API. Token registered at login. |
| Camera | expo-camera + expo-image-picker | Site photo capture. Multiple photo selection from gallery. |
| File Sharing | expo-sharing + expo-file-system | Share PDFs via WhatsApp, Email, or any share target. |
| Biometric Auth | expo-local-authentication | Face ID / Touch ID / Fingerprint for app unlock and sensitive actions. |
| PDF Viewer | react-native-pdf | In-app viewing of quotation and PO PDFs. |
| Charts | victory-native or react-native-chart-kit | Dashboard KPI charts, burn rate visualization, wallet pie charts. |
| Forms | React Hook Form + Zod | Same validation patterns as web app. |
| Date Handling | date-fns | Same library as web app. |

### 3.2 Project Structure

```
/mobile
  /app                          # Expo Router file-based routes
    /(auth)                     # Public routes (no bottom tabs)
      /login.tsx
      /forgot-password.tsx
      /org-selector.tsx
    /(tabs)                     # Protected routes (bottom tab bar)
      /_layout.tsx              # Tab bar configuration (role-based)
      /home.tsx                 # Dashboard (role-switched)
      /leads/
        /index.tsx              # Lead list
        /[id].tsx               # Lead detail
        /new.tsx                # Create lead
        /pipeline.tsx           # Kanban view
      /quotes/
        /index.tsx              # Quote list
        /[id].tsx               # Quote detail
      /projects/
        /index.tsx              # Project list
        /[id]/
          /index.tsx            # Project overview
          /timeline.tsx         # Sprint timeline
          /finance.tsx          # Project wallet
          /daily-logs.tsx       # Daily log feed
      /attendance/
        /index.tsx              # Mark attendance
        /history.tsx            # Attendance history
      /materials/
        /index.tsx              # Material indent
        /history.tsx            # Indent history
      /finance/
        /index.tsx              # Transaction list
        /approvals.tsx          # Pending approvals
      /payments/
        /index.tsx              # Payment history (client)
        /pay.tsx                # Razorpay checkout (client)
      /notifications.tsx        # Notification center
      /profile/
        /index.tsx              # My profile
        /settings.tsx           # App settings
  /components
    /ui                         # Base UI components (Button, Card, Badge, Input, etc.)
    /forms                      # Form components (LeadForm, AttendanceForm, etc.)
    /charts                     # Chart components (KPICard, WalletChart, etc.)
    /layout                     # Shell, TabBar, Header components
    /shared                     # LoadingScreen, EmptyState, ErrorState, etc.
  /lib
    /api.ts                     # Axios instance with JWT interceptor
    /auth.ts                    # Auth utilities (login, logout, refresh)
    /storage.ts                 # Secure storage helpers
    /offline.ts                 # Offline queue manager
    /notifications.ts           # Push notification registration + handling
    /sharing.ts                 # PDF sharing utilities
  /hooks
    /useAuth.ts                 # Auth state hook
    /useLeads.ts                # TanStack Query hooks for leads
    /useProjects.ts             # TanStack Query hooks for projects
    /useFinance.ts              # TanStack Query hooks for finance
    /useNotifications.ts        # Notification polling hook
    /useOfflineSync.ts          # Offline queue sync hook
  /store
    /authStore.ts               # Zustand: user, tokens, org context
    /uiStore.ts                 # Zustand: theme, sidebar, preferences
    /draftStore.ts              # Zustand: offline drafts (leads, logs, attendance)
  /types
    /api.ts                     # Response/request types (mirrors backend schemas)
    /navigation.ts              # Route param types
  /constants
    /roles.ts                   # Role definitions and permissions
    /sprints.ts                 # Standard 6 sprint definitions
    /colors.ts                  # Design system color tokens
```

### 3.3 Authentication Flow

```
1. App Launch
   |
   v
2. Check expo-secure-store for existing tokens
   |
   +--> Tokens exist --> Validate access token (GET /api/v1/auth/me)
   |    |
   |    +--> Valid --> Check org context
   |    |    |
   |    |    +--> Single org --> Navigate to /(tabs)/home
   |    |    +--> Multiple orgs --> Navigate to /(auth)/org-selector
   |    |
   |    +--> 401 --> Attempt refresh (POST /api/v1/auth/refresh)
   |         |
   |         +--> Success --> Retry /auth/me
   |         +--> Fail --> Clear tokens --> Navigate to /(auth)/login
   |
   +--> No tokens --> Navigate to /(auth)/login
```

**Token Storage:**
- `access_token` -- stored in expo-secure-store (encrypted, per-device)
- `refresh_token` -- stored in expo-secure-store
- `org_id` -- stored in expo-secure-store
- `user_role` -- stored in Zustand (derived from /auth/me response)

**Biometric unlock flow:**
- On subsequent app opens (tokens exist, app was backgrounded), prompt for Face ID/Fingerprint before showing data
- Biometric is optional, toggled in Settings
- If biometric fails 3 times, fall back to full re-login

### 3.4 API Client Configuration

The Axios instance mirrors the web app pattern exactly:

```
Base URL: {org_slug}.igolo.app/api/v1/
           OR
           api.igolo.app/api/v1/ (with X-Tenant-Slug header)

Request Interceptor:
  - Inject Authorization: Bearer {access_token} from secure store
  - Inject X-Org-ID: {org_id} if present

Response Interceptor:
  - 401 --> Attempt token refresh silently
  - If refresh fails --> Clear auth state --> Navigate to login
  - 402 --> Show "Insufficient Funds" bottom sheet
  - 403 --> Show "Access Denied" screen
  - 429 --> Show "Too many requests, try again" toast
  - 5xx --> Show "Server error" with retry button
```

### 3.5 Offline Architecture

```
Online Mode:
  API Request --> Success --> Update TanStack Query cache --> Render

Offline Mode (detected via NetInfo):
  Write Operations:
    User Action --> Save to draftStore (Zustand persisted to AsyncStorage)
                --> Show "Saved offline" badge on the item
                --> When online: useOfflineSync hook processes the queue
                    --> POST/PUT to API --> On success: remove from queue
                    --> On fail: increment retry count, keep in queue

  Read Operations:
    Use TanStack Query staleTime + gcTime to serve cached data
    Show "Offline -- showing cached data" banner at top of screen
    Disable actions that cannot be queued (e.g., Razorpay payment)
```

**Offline-capable write operations:**
- Create lead (draft)
- Add lead activity (queued)
- Submit daily log (queued, photos stored locally)
- Mark attendance (queued)
- Submit material indent request (queued)

**NOT offline-capable (require real-time):**
- Razorpay payment
- Approve/reject actions (must reflect latest state)
- Quotation creation (too complex for offline)
- Financial transactions

---

## 4. Role-Based Tab Navigation

The bottom tab bar displays different tabs based on the authenticated user's role. The tab bar uses a custom component (not the default Expo Router tab bar) to support role switching and visual customization.

### 4.1 SUPER_ADMIN and MANAGER Tabs

| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| 1 | `LayoutDashboard` | Home | Admin Dashboard |
| 2 | `FolderKanban` | Projects | Project List |
| 3 | `Wallet` | Finance | Financial Overview |
| 4 | `Bell` | Alerts | Notification Center |
| 5 | `User` | Profile | My Profile |

**Rationale:** Managers need project oversight and financial controls front and center. Lead management is accessible via Home screen shortcuts, not a dedicated tab.

### 4.2 SALES and BDE Tabs

| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| 1 | `LayoutDashboard` | Home | Sales Dashboard |
| 2 | `Users` | Leads | Lead List |
| 3 | `FileText` | Quotes | Quotation List |
| 4 | `Bell` | Alerts | Notification Center |
| 5 | `User` | Profile | My Profile |

**Rationale:** Sales lives in the CRM. Leads and Quotes are their two primary workflows. Home shows today's follow-ups.

### 4.3 SUPERVISOR Tabs

| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| 1 | `LayoutDashboard` | Home | Supervisor Dashboard |
| 2 | `Camera` | Log | Daily Log Submission |
| 3 | `UserCheck` | Attend. | Mark Attendance |
| 4 | `Package` | Materials | Material Indent |
| 5 | `User` | Profile | My Profile |

**Rationale:** Supervisors have exactly three tasks: log progress, mark attendance, request materials. These are the three middle tabs. No notification tab -- supervisors receive push notifications but the bell icon count is shown as a badge on the Home tab.

### 4.4 CLIENT Tabs

| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| 1 | `Home` | Project | My Project Overview |
| 2 | `CalendarDays` | Timeline | Sprint Timeline |
| 3 | `CreditCard` | Payments | Payment History + Pay |
| 4 | `ImageIcon` | Updates | Site Photo Feed |
| 5 | `User` | Profile | My Profile |

**Rationale:** Clients care about four things: overall status, timeline, paying, and seeing photos. That is the exact tab order.

### 4.5 Tab Bar Behavior

- Active tab icon is filled, inactive is outlined
- Active tab label uses the primary accent color
- Notification badge (red dot with count) appears on the Alerts tab (or Home tab for Supervisor)
- Tab bar is hidden during full-screen modals (photo gallery, PDF viewer, Razorpay checkout)
- Tab bar respects safe area insets on all devices (iPhone notch, Android gesture bar)
- Tab bar height: 56dp (Android) / 49pt + safe area (iOS)

---

## 5. Screen-by-Screen Specification

### 5.1 Auth Screens

---

#### Screen 1: Login

**Route:** `/(auth)/login`
**Roles:** All (pre-authentication)
**Header:** None (full-screen)

**Layout (top to bottom):**
1. **App Logo** -- Igolo Interior wordmark centered, 80px from top safe area
2. **Welcome text** -- "Sign in to your workspace" (16px, muted color)
3. **Org slug input** -- Text field with ".igolo.app" suffix shown inline. Placeholder: "your-company". Auto-lowercased, only alphanumeric and hyphens allowed.
4. **Email input** -- Standard email keyboard. Placeholder: "email@company.com"
5. **Password input** -- Secure text entry with eye toggle. Placeholder: "Password"
6. **Login button** -- Full-width primary button. Label: "Sign In". Shows spinner on loading.
7. **Forgot password link** -- Text button below login: "Forgot password?"
8. **Biometric shortcut** -- If previously authenticated and biometric enabled, show Face ID / Fingerprint icon below the form. Tapping triggers biometric auth which unlocks stored credentials.

**API Calls:**
- `POST /api/v1/auth/token` with `{ username: email, password, tenant_slug }`
- On success: store tokens, call `GET /api/v1/auth/me` to get user profile + org memberships

**Interaction Details:**
- Org slug field appears first. When user types and presses "Next", the field animates up and email/password appear below (progressive disclosure, reduces initial form overwhelm).
- If login returns `organizations` array with length > 1, navigate to Org Selector screen.
- If login returns single org context, navigate directly to `/(tabs)/home`.
- "Sign In" button is disabled until all three fields have content.
- Keyboard avoidance: form scrolls up when keyboard opens so active field is always visible.

**Error States:**
- Wrong credentials: Shake animation on the form + red text "Invalid email or password" below password field. Clear password field.
- Rate limited (429): "Too many attempts. Please try again in 60 seconds." Disable button with countdown timer.
- Network error: "Cannot connect to server. Check your internet connection." with Retry button.
- Invalid tenant slug: "Organization not found. Please check your workspace URL."

**Offline Behavior:** Login requires network. If offline, show banner: "You're offline. Connect to the internet to sign in."

---

#### Screen 2: Forgot Password

**Route:** `/(auth)/forgot-password`
**Roles:** All (pre-authentication)
**Header:** Back arrow (returns to Login)

**Layout:**
1. **Title** -- "Reset Password" (24px, bold)
2. **Description** -- "Enter the email address associated with your account. We'll send you a link to reset your password." (14px, muted)
3. **Email input** -- Standard email keyboard
4. **Send Reset Link button** -- Full-width primary button

**API Calls:**
- `POST /api/v1/auth/forgot-password` with `{ email }`

**Interaction Details:**
- Always shows success message regardless of whether email exists (prevents user enumeration, matches backend behavior): "If an account exists with this email, you'll receive a reset link shortly."
- After success, show a "Back to Login" button.
- The actual password reset happens via the web app (deep link from email opens web reset page). The mobile app does not handle the reset-password token flow directly.

**Error States:**
- Network error: same pattern as login screen
- Invalid email format: inline validation "Please enter a valid email address"

---

#### Screen 3: Organization Selector

**Route:** `/(auth)/org-selector`
**Roles:** Users with multiple org memberships
**Header:** "Select Workspace" with logout button (top right)

**Layout:**
1. **Title** -- "Choose a workspace" (24px, bold)
2. **Description** -- "You belong to multiple organizations. Select one to continue." (14px, muted)
3. **Org list** -- Vertical list of cards, one per org membership:
   - Org logo (or first letter avatar) on left
   - Org name (16px, bold)
   - Role badge below name (e.g., "Manager", "Sales")
   - Chevron right icon
   - If `is_default == true`, show a subtle "Default" badge

**API Calls:**
- `POST /api/v1/auth/select-org` with `{ org_id }` -- returns new token scoped to selected org

**Interaction Details:**
- Tapping an org card calls select-org API, stores new tokens, navigates to `/(tabs)/home`
- Long-press shows a context menu with "Set as default" option (so next login auto-selects this org)
- The same screen is accessible from Profile for org switching (via `POST /api/v1/auth/switch-org`)

**Empty State:** Should never be empty (user wouldn't reach this screen with 0 orgs).

---

### 5.2 Dashboard Screens

---

#### Screen 4: Admin / Manager Dashboard

**Route:** `/(tabs)/home` (when role is SUPER_ADMIN or MANAGER)
**Roles:** SUPER_ADMIN, MANAGER
**Header:** Org name on left, notification bell icon (with unread badge count) on right

**Layout (scrollable):**

1. **Greeting section** -- "Good morning, Vikram" (dynamic time-of-day greeting). Date: "Tuesday, 25 March 2026"

2. **KPI Cards Row (horizontal scroll)** -- Four cards in a horizontally scrollable row:
   - **Revenue This Month** -- Total INFLOW transactions this month. Green up/down arrow showing % change vs last month. Tapping navigates to Finance > Transactions filtered to current month.
   - **Active Projects** -- Count of projects with status IN_PROGRESS. Tapping navigates to Projects list filtered to active.
   - **Open Leads** -- Count of leads not in CONVERTED or LOST status. Tapping navigates to Leads list.
   - **Pending Approvals** -- Count from approvals/pending endpoint. Red badge if > 0. Tapping navigates to Approvals screen.

3. **Pending Approvals Section** -- If count > 0, show up to 3 approval cards with "View All" link:
   - Each card shows: entity type icon, description, amount (if financial), timestamp, two buttons: "Approve" (green) and "Reject" (red)
   - Swiping right on a card = Approve, swiping left = Reject (with haptic feedback + confirmation)

4. **Projects At Risk** -- Projects where total_spent / total_agreed_value > 0.7 and project is < 80% complete. Show as red-tinted cards with project name, spend percentage, and "View" button.

5. **Recent Transactions** -- Last 5 transactions across all projects. Each row shows: direction icon (green arrow up for INFLOW, red arrow down for OUTFLOW), project name, amount, source, timestamp. "View All" navigates to Finance.

6. **Quick Actions Grid** -- 2x2 grid of shortcut buttons:
   - "New Lead" (navigates to lead creation)
   - "New Quote" (navigates to quote creation)
   - "View Payroll" (navigates to payroll screen)
   - "Reports" (navigates to export screen or web view)

**API Calls:**
- `GET /api/v1/auth/me` -- user profile
- `GET /api/v1/notifications/unread-count` -- badge count
- `GET /api/v1/finance/summary` -- revenue KPI (current month date range)
- `GET /api/v1/projects?status=IN_PROGRESS` -- active project count
- `GET /api/v1/crm/leads` -- open lead count
- `GET /api/v1/approvals/pending` -- pending approvals list
- `GET /api/v1/finance/transactions?limit=5` -- recent transactions

**Pull-to-Refresh:** Invalidates all TanStack Query caches for the above endpoints.

**Empty State (new org):** "Welcome to Igolo Interior! Start by creating your first lead or inviting your team." with two action buttons.

**Error State:** If any API call fails, show the KPI card with "--" value and a subtle retry icon. Other sections that loaded successfully still render.

**Offline:** Show cached KPI values with "Last updated 2 hours ago" subtitle. Disable Quick Actions that require network.

---

#### Screen 5: Sales / BDE Dashboard

**Route:** `/(tabs)/home` (when role is SALES or BDE)
**Roles:** SALES, BDE
**Header:** Org name on left, notification bell on right

**Layout (scrollable):**

1. **Greeting section** -- Same as admin dashboard

2. **Today's Follow-ups** -- List of leads where next follow-up date is today. Each card shows:
   - Lead name and contact number
   - Lead status badge (color-coded)
   - Source (e.g., "Referral", "Website")
   - Quick action buttons: Phone icon (opens dialer), WhatsApp icon (opens WhatsApp with number pre-filled)
   - If no follow-ups today: "No follow-ups scheduled for today. Enjoy your day!" with illustration

3. **My Pipeline Summary** -- Horizontal stat bar showing lead counts by status:
   - NEW | CONTACTED | QUALIFIED | QUOTATION_SENT | NEGOTIATION
   - Each segment is color-coded and tappable (filters lead list to that status)

4. **Recent Quotes** -- Last 3 quotations created by this user. Card shows: lead name, version (v1, v2), status badge, total amount, created date. Tapping navigates to quote detail.

5. **Quick Actions** -- Two large buttons:
   - "Add New Lead" (primary, prominent)
   - "Create Quote" (secondary)

**API Calls:**
- `GET /api/v1/crm/leads?assigned_to={user_id}` -- all leads for pipeline summary + follow-ups (client-side filtering by follow-up date)
- `GET /api/v1/quotes?limit=3` -- recent quotes
- `GET /api/v1/notifications/unread-count`

**Pull-to-Refresh:** Invalidates lead and quote caches.

---

#### Screen 6: Supervisor Dashboard

**Route:** `/(tabs)/home` (when role is SUPERVISOR)
**Roles:** SUPERVISOR
**Header:** Org name on left, notification bell (with badge) on right

**Layout (scrollable):**

1. **Today's Site Card** -- Large card showing the supervisor's assigned project for today:
   - Project name (bold, 20px)
   - Client name
   - Site address (tappable, opens Google Maps)
   - Active sprint name and status (e.g., "Sprint 4: Carpentry & False Ceiling -- ACTIVE")
   - Sprint progress bar (based on date elapsed)

2. **Today's Status Indicators** -- Three icon-label pairs in a horizontal row:
   - Attendance: checkmark icon (green if submitted today, gray if not). Label: "Marked" or "Not marked"
   - Daily Log: camera icon (green if submitted, gray if not). Label: "Logged" or "Pending"
   - Material Requests: package icon with count of pending requests

3. **Pending Material Requests** -- List of this supervisor's material requests with status:
   - Item name, quantity, priority, status badge (PENDING / APPROVED / REJECTED / FULFILLED)
   - Only show requests from the last 7 days

4. **Quick Actions** -- Three buttons:
   - "Mark Attendance" (large, primary)
   - "Submit Daily Log" (large, primary)
   - "Request Material" (secondary)

**API Calls:**
- `GET /api/v1/projects` -- supervisor's assigned projects (filtered client-side by supervisor role)
- `GET /api/v1/labor/attendance?date_from={today}&date_to={today}` -- check if submitted today
- `GET /api/v1/projects/{id}/daily-logs?limit=1` -- check if log submitted today
- `GET /api/v1/material-requests/?project_id={id}&limit=10`
- `GET /api/v1/notifications/unread-count`

**Empty State (no assigned project):** "No active project assigned. Contact your manager." with a phone/message button.

---

#### Screen 7: Client Dashboard

**Route:** `/(tabs)/home` (when role is CLIENT)
**Roles:** CLIENT
**Header:** "My Project" on left, notification bell on right

**Layout (scrollable):**

1. **Project Hero Card** -- Full-width card with:
   - Project name (bold, 22px)
   - Project status badge
   - **Progress Ring** -- Large circular progress indicator (based on completed sprints / total sprints). Center shows percentage. Color: green if on track, amber if delayed, red if significantly delayed.
   - "Started: Jan 15" and "Expected: Apr 30" dates below

2. **Current Sprint Card** -- The active sprint:
   - Sprint name (e.g., "Sprint 4: Woodwork & Carpentry")
   - Sprint status badge
   - Date range
   - Day count: "Day 12 of 25"
   - Progress bar

3. **Financial Summary** -- Simple card:
   - "Total Project Value: Rs. 25,00,000"
   - "Total Paid: Rs. 15,00,000" (green)
   - "Remaining: Rs. 10,00,000" (amber)
   - Progress bar (paid / total)
   - "Pay Now" button if remaining > 0

4. **Recent Updates** -- Last 3 daily logs marked `visible_to_client = true`:
   - Date, sprint name, notes excerpt (2 lines max), thumbnail of first photo
   - "View All Updates" link

5. **Next Milestone** -- The next sprint that hasn't started:
   - Sprint name, estimated start date
   - "Your next phase starts in 5 days"

**API Calls:**
- `GET /api/v1/projects` -- client's projects (should be 1 or few)
- `GET /api/v1/projects/{id}` -- full project with sprints
- `GET /api/v1/finance/projects/{id}/wallet` -- wallet for financial summary
- `GET /api/v1/projects/{id}/daily-logs?visible_to_client=true&limit=3` -- recent updates

**Empty State (project not started):** "Your project hasn't started yet. We'll notify you when work begins!" with expected start date.

---

### 5.3 Lead Screens

---

#### Screen 8: Lead List

**Route:** `/(tabs)/leads` or `/(tabs)/leads/index`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** "Leads" on left, search icon + filter icon on right, "+" FAB (floating action button) bottom right

**Layout:**
- **Search bar** -- Expands from icon tap. Searches by name, contact number, or email (client-side filter on loaded data + debounced API search for server-side when typing pauses).
- **Filter chips** -- Horizontal scrollable row below search: "All", "New", "Contacted", "Qualified", "Quotation Sent", "Negotiation". Active chip is filled, others outlined. Tapping filters the list.
- **Lead cards** -- Vertical scrollable list. Each card:
  - Left: First letter avatar (colored by status)
  - Center: Lead name (bold), contact number below, source tag (small, muted), assigned_to name
  - Right: Status badge (colored), date (relative: "2h ago", "Yesterday")
  - Swipe right on card: Quick call action (opens dialer)
  - Swipe left on card: Quick WhatsApp action (opens WhatsApp with number)

**API Calls:**
- `GET /api/v1/crm/leads?status={filter}&skip={offset}&limit=20` -- paginated, filtered
- Infinite scroll: load next page when user reaches bottom

**Pull-to-Refresh:** Reloads first page with current filters.

**Empty State (no leads at all):** Illustration of an empty inbox. "No leads yet. Tap + to add your first lead."

**Empty State (filter returns nothing):** "No leads matching this filter. Try a different status."

**Offline:** Show cached leads. "+" FAB still works (creates offline draft). Search works on cached data only.

---

#### Screen 9: Lead Detail

**Route:** `/(tabs)/leads/[id]`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** Back arrow, lead name as title, three-dot menu (Edit, Convert to Client)

**Layout (scrollable with sticky header):**

1. **Lead Info Card** -- Top card:
   - Name (24px, bold)
   - Contact number (tappable -> dialer) with phone icon
   - Email (tappable -> email app) with mail icon
   - Source badge
   - Status badge (large, colored)
   - Assigned to: user name with avatar
   - Created date
   - Two action buttons row: "Call" (phone icon) | "WhatsApp" (green icon) | "Email" (mail icon)

2. **Status Stepper** -- Horizontal stepper showing the lead pipeline stages. Completed stages are filled circles, current stage is highlighted, future stages are outlined. Stages: NEW -> CONTACTED -> QUALIFIED -> QUOTATION_SENT -> NEGOTIATION -> CONVERTED

3. **Linked Quotations Section** -- If quotations exist for this lead:
   - Card per quotation: version, status, total amount, date
   - "Create New Quote" button at the bottom if no DRAFT quote exists

4. **Activity Feed** -- Chronological list (newest first) of all activities:
   - Each entry: activity type icon (phone for call, calendar for meeting, note for note, map-pin for site visit), title, notes excerpt, date/time, user who logged it
   - "Add Activity" floating button at section bottom

5. **Notes Section** -- Expandable area showing the lead's notes field. Editable inline with "Save" button on change.

**API Calls:**
- `GET /api/v1/crm/leads/{id}` -- lead detail
- `GET /api/v1/crm/leads/{id}/activities` -- activity feed
- `GET /api/v1/quotes?lead_id={id}` -- linked quotations

**Actions:**
- **Edit:** Three-dot menu > "Edit" opens an edit sheet with pre-filled form (name, number, email, source, status, assigned_to, notes). Calls `PUT /api/v1/crm/leads/{id}`.
- **Convert to Client:** Three-dot menu > "Convert to Client" (MANAGER/SUPER_ADMIN only). Shows confirmation dialog: "Convert this lead to a client? A user account will be created." On confirm: `POST /api/v1/crm/leads/{id}/convert`.
- **Add Activity:** Opens bottom sheet modal.

**Error State:** If lead not found (404), show "Lead not found" with back button.

---

#### Screen 10: Create Lead

**Route:** `/(tabs)/leads/new`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** "New Lead" with close (X) button on right

**Layout (form in a scrollable view):**

1. **Name field** (required) -- Text input, auto-capitalize words. Placeholder: "Client full name"
2. **Contact Number field** (required) -- Phone keyboard. Country code picker defaulting to +91 (India). Placeholder: "9876543210"
3. **Email field** (optional) -- Email keyboard. Placeholder: "email@example.com"
4. **Source picker** (required) -- Bottom sheet select: "Website", "Referral", "Social Media", "Walk-in", "Property Expo", "JustDial", "Other"
5. **Notes field** (optional) -- Multi-line text area, 4 lines visible. Placeholder: "Meeting notes, requirements, budget range..."
6. **Assigned To picker** (optional, defaults to self) -- Only shown for MANAGER/SUPER_ADMIN. Searchable dropdown of org members with SALES/BDE roles.
7. **Submit button** -- Full-width primary button: "Create Lead". Disabled until required fields are filled.

**API Calls:**
- `POST /api/v1/crm/leads` with payload `{ name, contact_number, email, source, notes, assigned_to_id }`

**Interaction Details:**
- On success: haptic success feedback, brief green checkmark animation, navigate back to Lead List (which auto-refreshes)
- Form validation happens on blur (inline) and on submit (all fields)
- If contact_number already exists for another lead, API returns 409 -- show inline error: "A lead with this phone number already exists"

**Offline Behavior:**
- If offline, show banner "You're offline. This lead will be saved as a draft and synced when you reconnect."
- On submit: save to draftStore, show in Lead List with "Draft" badge and a sync icon
- When online: useOfflineSync processes the queue, replaces draft with server response

---

#### Screen 11: Lead Activity Log

**Route:** Bottom sheet modal from Lead Detail
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN

**Layout (bottom sheet, 70% screen height):**

1. **Activity Type selector** -- Horizontal pill buttons: "Call" | "Meeting" | "Note" | "Email" | "Site Visit"
2. **Notes field** -- Multi-line text. Placeholder changes based on type: "Call notes..." / "Meeting summary..." / etc.
3. **Voice-to-text button** -- Microphone icon next to notes field. Tapping starts platform native speech recognition. Transcribed text appends to notes field.
4. **Follow-up date picker** (optional) -- Date picker: "Schedule next follow-up". Sets a reminder for this lead.
5. **Submit button** -- "Log Activity"

**API Calls:**
- `POST /api/v1/crm/leads/{id}/activities` with `{ type, notes, follow_up_date }`

**Interaction Details:**
- Bottom sheet can be dismissed by swipe-down gesture
- On success: dismiss sheet, activity appears at top of the feed with a subtle highlight animation
- Voice-to-text shows a pulsing microphone indicator while listening

**Offline:** Queued for sync. Activity appears in feed with "Pending sync" indicator.

---

#### Screen 12: Lead Pipeline (Kanban)

**Route:** `/(tabs)/leads/pipeline`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** "Pipeline" with toggle to switch between List and Kanban view

**Layout:**
- **Horizontal scrollable columns** -- One column per status: NEW, CONTACTED, QUALIFIED, QUOTATION_SENT, NEGOTIATION, CONVERTED, LOST
- Each column:
  - Header: Status name + count badge
  - Vertically scrollable list of lead mini-cards: name, contact number, source, relative date
  - Cards are NOT drag-and-drop on mobile (too finicky). Instead, tapping a card navigates to Lead Detail where status can be changed.
- Column widths: 280dp, with horizontal snap scrolling

**API Calls:**
- `GET /api/v1/crm/leads?limit=200` -- fetch all leads, group client-side by status

**Performance Note:** For orgs with 200+ leads, implement pagination per column. Initial load fetches first 20 per status.

---

### 5.4 Quotation Screens

---

#### Screen 13: Quote List

**Route:** `/(tabs)/quotes` or `/(tabs)/quotes/index`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** "Quotations" on left, filter icon on right

**Layout:**
- **Filter chips** -- "All", "Draft", "Sent", "Approved", "Rejected"
- **Quote cards** -- Each card:
  - Lead/client name (bold)
  - Quote version: "v2" badge
  - Status badge (colored: blue=DRAFT, amber=SENT, green=APPROVED, red=REJECTED)
  - Total amount (Rs. formatted with comma separators)
  - Room count: "3 rooms"
  - Date created
  - Right arrow for navigation

**API Calls:**
- `GET /api/v1/quotes?status={filter}&skip={offset}&limit=20`

**Pull-to-Refresh:** Reloads with current filter.

**Empty State:** "No quotations yet. Create one from a lead's detail page."

---

#### Screen 14: Quote Detail

**Route:** `/(tabs)/quotes/[id]`
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN
**Header:** Back arrow, "Quote v{version}" as title, three-dot menu

**Layout (scrollable with tabs):**

**Top Section (always visible):**
- Lead/client name
- Status badge (large)
- Total amount (28px, bold)
- Valid until date
- Action buttons row (context-dependent):
  - DRAFT: "Finalize" | "Download PDF" | "Share"
  - SENT: "Download PDF" | "Share"
  - DRAFT/SENT (MANAGER only): "Approve" | "Reject"

**Tab Bar (segmented control):**
- **Summary** tab
- **Rooms** tab

**Summary Tab:**
- Room-wise total breakdown table: Room Name | Item Count | Subtotal
- Grand total row at bottom
- Terms and conditions (expandable section)

**Rooms Tab:**
- Accordion-style expandable sections, one per room
- Room header: Room name, area (sqft), room subtotal
- Expanded: Table of items: Item Name | Qty | Unit Price | Markup % | Line Total
- Each item row shows the inventory item name and any custom description override

**API Calls:**
- `GET /api/v1/quotes/{id}` -- full quotation with nested rooms and items

**Actions:**
- **Finalize:** Calls `POST /api/v1/quotes/{id}/finalize`. Confirmation dialog: "Finalize this quote as v{next_version}? This cannot be undone."
- **Approve/Reject (MANAGER):** Calls `PATCH /api/v1/quotes/{id}/status` with `{ status: "APPROVED" }` or `{ status: "REJECTED" }`
- **Download PDF:** Calls `GET /api/v1/quotes/{id}/pdf`. Downloads to device temp storage, then opens with system PDF viewer.
- **Share:** Downloads PDF, then opens system share sheet (WhatsApp, Email, AirDrop, etc.)
- **Send to Client:** Calls `POST /api/v1/quotes/{id}/send`. Confirmation: "Email this quote to the client?"

---

#### Screen 15: Quote PDF Preview

**Route:** Full-screen modal from Quote Detail
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN

**Layout:**
- Full-screen PDF viewer using react-native-pdf
- Pinch-to-zoom support
- Page indicator at bottom: "Page 1 of 3"
- Top bar: Close (X) button, Share button
- Bottom bar: "Download" button, "Share via WhatsApp" shortcut button

**API Calls:**
- `GET /api/v1/quotes/{id}/pdf` -- returns PDF binary stream

---

#### Screen 16: Share Quote

**Route:** System share sheet (triggered from Quote Detail or PDF Preview)
**Roles:** BDE, SALES, MANAGER, SUPER_ADMIN

**Implementation:**
1. Download PDF to local temp directory using `expo-file-system`
2. Call `expo-sharing.shareAsync(localFileUri)` which opens the native share sheet
3. User selects WhatsApp, Email, or any available share target
4. After sharing, clean up temp file

**WhatsApp shortcut:** If the lead has a phone number, provide a direct "Share via WhatsApp" button that:
1. Downloads PDF
2. Opens WhatsApp with the number pre-filled and the PDF attached

---

#### Screen 17: Quick Quote (Simplified Mobile Quote)

**Route:** Accessible from Dashboard quick actions
**Roles:** SALES, MANAGER, SUPER_ADMIN
**Header:** "Quick Quote" with close button

**Note:** Full quotation creation (room-by-room, item-by-item) is complex and better suited for the web app. The mobile "Quick Quote" is a simplified flow:

**Layout (stepped form):**

**Step 1: Select Lead**
- Searchable lead picker (only leads without an active DRAFT quote)

**Step 2: Add Rooms**
- "Add Room" button
- For each room: Room name dropdown (Kitchen, Master Bedroom, Guest Bedroom, Living Room, Bathroom, Study, Kids Room, Custom), Area (sqft) field
- Swipe to remove room

**Step 3: Add Items per Room**
- Room accordion headers
- Per room: "Add Item" button opens searchable item picker (from inventory)
- Per item: Quantity field, Markup % field (defaults to 20)
- Auto-calculated line total shown
- Running total shown at bottom

**Step 4: Review & Save**
- Summary of rooms and totals
- "Save as Draft" button

**API Calls:**
- `GET /api/v1/crm/leads` -- lead picker data
- `GET /api/v1/inventory/items` -- item picker data (cached aggressively)
- `POST /api/v1/quotes` -- create quotation with nested rooms and items

---

### 5.5 Project Screens

---

#### Screen 18: Project List

**Route:** `/(tabs)/projects` or `/(tabs)/projects/index`
**Roles:** MANAGER, SUPER_ADMIN (full list), SUPERVISOR (assigned only), CLIENT (own only)
**Header:** "Projects" with filter icon

**Layout:**
- **Filter chips** -- "All", "In Progress", "Not Started", "On Hold", "Completed"
- **Project cards** -- Each card:
  - Project name (bold, 18px)
  - Client name (muted, 14px)
  - Status badge (colored)
  - **Mini progress bar** -- based on completed sprints / 6
  - Financial summary: "Rs. 15L / 25L spent" (compact format)
  - Active sprint name
  - Manager name tag
  - Right arrow

**API Calls:**
- `GET /api/v1/projects?status={filter}&skip={offset}&limit=20`

**Card Interaction:** Tap navigates to Project Detail. Long-press shows context menu: "View Finance", "View Timeline", "Call Client".

**Empty State:** "No projects yet. Convert an approved quotation to start a project."

---

#### Screen 19: Project Detail

**Route:** `/(tabs)/projects/[id]`
**Roles:** All authenticated roles (visibility scoped by API)
**Header:** Back arrow, project name, three-dot menu

**Layout (scrollable with segmented tab bar):**

**Hero Section (always visible):**
- Project name (24px bold)
- Client name and contact (tappable)
- Status badge
- Progress ring (small, 60px)
- Site address (tappable -> Google Maps)

**Segmented Tab Bar:**
- **Overview** | **Sprints** | **Finance** | **Logs**

**Overview Tab:**
- Sprint summary: 6 sprint cards in a vertical list, each showing name, status, date range, and a mini progress indicator (percent of days elapsed)
- Manager and Supervisor assigned
- Project dates (start, expected end)
- Variation Orders section: count + total additional cost

**Sprints Tab:**
- Scrollable list of 6 sprint cards with more detail:
  - Sprint name, sequence number
  - Status badge (PENDING / ACTIVE / COMPLETED / DELAYED)
  - Start date -- End date
  - Duration in days
  - If ACTIVE: day progress bar
  - If DELAYED: red text showing "Delayed by X days"
  - Tap to expand showing daily logs for that sprint

**Finance Tab:**
- Wallet summary card:
  - Total Agreed Value
  - Total Received (green)
  - Total Spent (red)
  - Current Balance
  - Doughnut chart visualization
- Recent transactions list (last 10)
- "View All Transactions" button

**Logs Tab:**
- Daily log feed (newest first):
  - Date, sprint name, submitted by
  - Notes text (expandable)
  - Photo thumbnails (tappable -> full-screen gallery)
  - Progress percentage indicator
  - Visibility indicator: eye icon if visible_to_client, eye-off if not

**API Calls:**
- `GET /api/v1/projects/{id}` -- project with sprints
- `GET /api/v1/finance/projects/{id}/wallet` -- wallet data
- `GET /api/v1/finance/projects/{id}/transactions?limit=10` -- recent transactions
- `GET /api/v1/projects/{id}/daily-logs?limit=20` -- daily logs
- `GET /api/v1/projects/{id}/variation-orders` -- VOs

---

#### Screen 20: Sprint Timeline

**Route:** `/(tabs)/projects/[id]/timeline` (also the Timeline tab for CLIENT)
**Roles:** All roles with project access
**Header:** Back arrow, "Timeline"

**Layout:**
- **Horizontal scrollable timeline visualization**
- Each sprint is a horizontal bar:
  - Color-coded by status: gray (PENDING), blue (ACTIVE), green (COMPLETED), red (DELAYED)
  - Bar width proportional to duration
  - Sprint name label above bar
  - Date range label below bar
  - Planned bar (outline) and Actual bar (filled) overlaid to show planned vs actual
- Time axis along the bottom with month/week markers
- Today marker (vertical dashed line, red)
- Pinch-to-zoom for time scale

**For MANAGER role (edit mode):**
- Long-press on a sprint bar end to drag and extend/shorten duration
- On release: confirmation dialog "Extend Sprint 4 by 3 days? This will shift all subsequent sprints."
- On confirm: `PATCH /api/v1/projects/{id}/sprints/{sprint_id}` with new end_date
- Optimistic update: subsequent sprint bars shift immediately, API confirms in background

**For CLIENT role:**
- Read-only view
- Additional: milestone markers (stars) at sprint boundaries with labels like "Carpentry begins"

**Implementation note:** Use a custom horizontal ScrollView with SVG/Canvas rendering rather than a heavy Gantt chart library. The 6-sprint fixed structure simplifies the layout significantly.

---

#### Screen 21: Sprint Detail

**Route:** Expandable from Project Detail Sprints tab, or tappable card
**Roles:** MANAGER, SUPER_ADMIN, SUPERVISOR

**Layout (bottom sheet, 80% height):**
1. **Sprint header** -- Name, sequence, status badge, date range
2. **Status controls** (MANAGER only) -- Segmented control to change status: PENDING | ACTIVE | COMPLETED. Changing status calls `PATCH /api/v1/projects/{id}/sprints/{sprint_id}`.
3. **Date range editor** (MANAGER only) -- Tappable start/end dates open date pickers. Changing end_date triggers the ripple update.
4. **Progress slider** -- Drag to set percentage (0-100%). Visual only, not persisted in current API (could be derived from daily logs).
5. **Daily logs for this sprint** -- Filtered feed of logs for this sprint_id
6. **Linked labor attendance** -- Summary of attendance logged against this sprint

---

#### Screen 22: Variation Order

**Route:** Accessed from Project Detail overview
**Roles:** MANAGER, SUPER_ADMIN (create/approve), SUPERVISOR (create), CLIENT (view)

**View mode (list within Project Detail):**
- Card per VO: description, additional cost, status badge (REQUESTED / APPROVED / REJECTED / PAID)
- Total additional cost sum at top

**Create VO (bottom sheet):**
1. **Description** -- Multi-line text: "What additional work is needed?"
2. **Additional Cost** -- Currency input (Rs.)
3. **Submit** -- "Request Variation Order"
- `POST /api/v1/projects/{id}/variation-orders`

**Approve/Reject VO (MANAGER, bottom sheet):**
- Shows VO details
- "Approve" and "Reject" buttons
- Optional: link to a sprint dropdown (which sprint does this VO affect?)
- `PATCH /api/v1/projects/{id}/variation-orders/{vo_id}` with status + linked_sprint_id

---

### 5.6 Daily Log Screens

---

#### Screen 23: Add Daily Log

**Route:** `/(tabs)/log` (Supervisor) or accessible from Project Detail
**Roles:** SUPERVISOR, MANAGER, SUPER_ADMIN
**Header:** "Daily Log" with close button

**Layout (stepped or single-scroll form):**

1. **Project Picker** -- If supervisor has multiple projects, dropdown to select. If single project, auto-selected and shown as read-only.
2. **Sprint Picker** -- Dropdown showing the project's sprints. Auto-selects the ACTIVE sprint. Shows sprint name and date range.
3. **Notes field** (required) -- Multi-line text, 6 lines visible. Placeholder: "What work was completed today?"
   - Microphone icon for voice-to-text
4. **Photo capture** -- "Add Photos" button opens choice: "Take Photo" (camera) or "Choose from Gallery" (multi-select up to 10)
   - Photo thumbnails shown in horizontal scroll row below button
   - Each thumbnail has an X button to remove
   - Photos are compressed to 1080p max before upload
5. **Progress Percentage** -- Slider (0-100%) with numeric input fallback. Label: "Sprint progress after today's work"
6. **Blockers field** (optional) -- Text input. Placeholder: "Any blockers? (material shortage, design change, etc.)"
7. **Visible to Client toggle** -- Switch with label "Show this update to the client". Default: ON.
8. **Submit button** -- "Submit Daily Log"

**API Calls:**
- `POST /api/v1/upload` (category: "daily-logs") -- for each photo, upload and get URL
- `POST /api/v1/projects/{id}/daily-logs` with `{ sprint_id, notes, images: [urls], progress_percentage, blockers, visible_to_client }`

**Interaction Details:**
- Photo upload happens in background after submit is tapped. Show upload progress per photo.
- If one photo fails to upload, retry automatically. If all retries fail, save the log without that photo and show a toast: "1 photo failed to upload. You can re-add it later."
- On success: haptic success, brief checkmark animation, navigate back. Supervisor Dashboard updates to show "Logged" for today.

**Offline Behavior:**
- Photos saved to local storage (expo-file-system document directory)
- Log saved to draftStore with local photo paths
- When online: photos uploaded first, then log submitted with server URLs
- Show "Draft -- will sync when online" badge in Daily Log History

---

#### Screen 24: Daily Log History

**Route:** Accessed from Project Detail Logs tab or Supervisor Dashboard
**Roles:** All with project access
**Header:** "Site Updates" with filter icon

**Layout:**
- **Feed view** -- Instagram-style vertical feed, newest first
- Each log entry:
  - **Header row:** User avatar, user name, date/time, sprint name badge
  - **Notes text** -- Full text, expandable if > 3 lines
  - **Photo carousel** -- Horizontal scrollable row of photo thumbnails. Tapping opens full-screen gallery.
  - **Blockers section** (if present) -- Red-tinted card with blocker text
  - **Footer row:** Progress badge ("75% complete"), visibility icon (eye if visible to client)

**API Calls:**
- `GET /api/v1/projects/{id}/daily-logs?sprint_id={optional}&skip={offset}&limit=10`
- For CLIENT role: `GET /api/v1/projects/{id}/daily-logs?visible_to_client=true`

**Infinite scroll:** Load more as user scrolls down.

---

#### Screen 25: Photo Gallery

**Route:** Full-screen modal from any photo thumbnail
**Roles:** All with project access

**Layout:**
- Full-screen image viewer with swipe-left/right to navigate between photos in the set
- Pinch-to-zoom
- Top bar: Close (X), share icon, download icon
- Bottom bar: photo counter "3 of 7", date, log notes excerpt
- Background: black

**Implementation:** Use a FlatList with horizontal paging and `react-native-fast-image` for smooth loading.

---

### 5.7 Attendance Screens

---

#### Screen 26: Mark Attendance

**Route:** `/(tabs)/attendance` (Supervisor tab)
**Roles:** SUPERVISOR, MANAGER, SUPER_ADMIN
**Header:** "Mark Attendance"

**Layout (form):**

1. **Date** -- Defaults to today. Tappable to pick a different date (up to 2 days in the past, for late entries). Future dates disabled.
2. **Project Picker** -- Dropdown of supervisor's assigned projects
3. **Sprint Picker** -- Auto-selects ACTIVE sprint for selected project
4. **Team Picker** -- Dropdown of labor teams: shows team name, specialization, leader name
5. **Workers Present** (required) -- Numeric stepper (- and + buttons) or direct input. Min: 1, Max: team size.
6. **Total Hours** (required) -- Numeric input with 0.5 increments. Default: 8. Buttons for quick select: "4h" "6h" "8h" "10h"
7. **Auto-calculated cost** -- Read-only display: "{workers} x Rs. {daily_rate} x ({hours}/8) = Rs. {total}". Updates live as inputs change.
8. **Site photo** (optional but recommended) -- Camera button to take a photo of the team on site. Shown as thumbnail.
9. **Submit button** -- "Mark Attendance"

**API Calls:**
- `GET /api/v1/labor/teams` -- team list
- `POST /api/v1/upload` (category: "attendance") -- photo upload
- `POST /api/v1/labor/attendance` with `{ project_id, sprint_id, team_id, date, workers_present, total_hours, site_photo_url }`

**Interaction Details:**
- If attendance already logged for this team + project + date combination, show warning: "Attendance already marked for this team today. Submitting will create a duplicate."
- On success: card appears in Attendance History, Supervisor Dashboard updates to "Marked"
- Cost calculation formula matches backend: `workers_present * daily_rate * (total_hours / 8)`

**Offline:** Full offline support. Queued in draftStore. Photo stored locally.

---

#### Screen 27: Attendance History

**Route:** `/(tabs)/attendance/history`
**Roles:** SUPERVISOR, MANAGER, SUPER_ADMIN
**Header:** "Attendance History" with calendar icon toggle

**Layout -- List View (default):**
- Cards grouped by date, newest first
- Each card: team name, project name, workers present, hours, cost, status badge (PENDING / APPROVED / PAID)
- Filter chips: "All", "Pending", "Approved", "Paid"

**Layout -- Calendar View (toggle):**
- Monthly calendar grid
- Days with attendance entries show a colored dot (green = all approved, amber = some pending, red = none submitted on a workday)
- Tapping a day shows that day's attendance entries in a bottom sheet

**API Calls:**
- `GET /api/v1/labor/attendance?project_id={id}&date_from={start}&date_to={end}&status={filter}`

---

#### Screen 28: Payroll Summary

**Route:** Accessed from Admin Dashboard or Finance tab
**Roles:** MANAGER, SUPER_ADMIN
**Header:** "Payroll" with date range picker

**Layout:**
1. **Week selector** -- Horizontal date range selector. Shows "Mon 10 Feb - Sun 16 Feb" with left/right arrows to navigate weeks.
2. **Total payroll amount** -- Large number: "Rs. 1,45,600" with status: "Rs. 98,000 approved, Rs. 47,600 pending"
3. **Team-wise breakdown** -- Expandable accordion cards per team:
   - Team name, specialization badge
   - Project name
   - Total days worked, total workers, total hours
   - Total cost for the week
   - Status: "Pending Approval" or "Approved"
   - "Approve & Pay" button (for pending items)
4. **Batch actions** -- "Approve All Pending" button at bottom (confirmation required)

**API Calls:**
- `GET /api/v1/labor/payroll?week_start={date}&week_end={date}` -- weekly summary
- `POST /api/v1/labor/payroll/approve?project_id={id}&team_id={id}&week_start={date}&week_end={date}` -- approve batch

**Interaction Details:**
- "Approve & Pay" checks the project wallet balance first (spending lock). If insufficient, shows error: "Insufficient project funds. Balance: Rs. X. Required: Rs. Y."
- On successful approval, haptic feedback + green checkmark + card status changes to "Approved"

---

### 5.8 Material & Inventory Screens

---

#### Screen 29: Material Indent Request

**Route:** `/(tabs)/materials` (Supervisor tab)
**Roles:** SUPERVISOR, MANAGER, SUPER_ADMIN
**Header:** "Request Material"

**Layout (form):**

1. **Project Picker** -- Auto-selected for Supervisor if single project
2. **Item Search** -- Searchable dropdown of inventory items. Shows: item name, category, unit, current stock level. Search calls `GET /api/v1/inventory/items?search={query}`.
3. **Selected Items List** -- Dynamic list, one row per selected item:
   - Item name
   - Quantity field (numeric, respects unit: "sqft", "nos", "kg")
   - Priority picker: "Normal" | "Urgent" (red)
   - Remove (X) button
4. **"Add Another Item" button** -- Adds a new blank row
5. **Notes field** (optional) -- "Any special instructions for this request"
6. **Submit button** -- "Submit Request"

**API Calls:**
- `GET /api/v1/inventory/items?search={query}` -- item search (debounced)
- `POST /api/v1/material-requests/` with `{ project_id, items: [{ item_id, quantity, priority }], notes }`

**Interaction Details:**
- If an item's current_stock is below the requested quantity, show amber warning: "Low stock: only 15 sqft available in warehouse"
- On success: navigate to Material History screen showing the new request with "PENDING" status

**Offline:** Full offline support. Item list cached from last online fetch. Request queued.

---

#### Screen 30: Indent History

**Route:** `/(tabs)/materials/history`
**Roles:** SUPERVISOR, MANAGER, SUPER_ADMIN
**Header:** "Material Requests" with filter icon

**Layout:**
- **Filter chips** -- "All", "Pending", "Approved", "Rejected", "Fulfilled"
- **Request cards** -- Each card:
  - Request date, project name
  - Item list with quantities (compact: "Plywood 18mm x 50 sqft, Hinges x 20 nos")
  - Status badge (PENDING_APPROVAL / APPROVED / REJECTED / FULFILLED)
  - Priority indicator (red exclamation for Urgent)
  - Approved quantities (if partially approved)

**API Calls:**
- `GET /api/v1/material-requests/?project_id={id}&status={filter}`

**MANAGER Actions:**
- Tapping a PENDING request opens approval bottom sheet:
  - Shows each item with requested quantity and an editable "Approved Qty" field (can partially approve)
  - "Approve" button calls `PATCH /api/v1/material-requests/{id}/approve`
  - "Reject" button calls `PATCH /api/v1/material-requests/{id}/reject`

---

#### Screen 31: Low Stock Alerts

**Route:** Push notification deep link or Dashboard card
**Roles:** MANAGER, SUPER_ADMIN

**Implementation:** Not a dedicated screen. Low stock alerts arrive as push notifications when items fall below reorder level. Tapping the notification navigates to the Inventory Items screen on the web app (deep link to web) or shows a bottom sheet with:
- Item name, current stock, reorder level
- "Create PO" button (navigates to web -- PO creation is too complex for mobile MVP)

---

### 5.9 Finance Screens

---

#### Screen 32: Project Wallet Overview

**Route:** `/(tabs)/projects/[id]/finance` (Finance tab within Project Detail)
**Roles:** MANAGER, SUPER_ADMIN, CLIENT (limited view)

**Layout:**
1. **Wallet Card** -- Full-width:
   - Total Agreed Value (bold, large)
   - Doughnut chart: Received (green segment), Spent (red segment), Remaining (gray segment)
   - Three stat rows:
     - "Received: Rs. 15,00,000" (green)
     - "Spent: Rs. 12,00,000" (red)
     - "Balance: Rs. 3,00,000" (bold)
   - Health indicator: Green checkmark "Healthy" / Amber warning "Caution" / Red alert "Over Budget"

2. **Spend Breakdown** -- Pie chart or horizontal bar: Material (%), Labor (%), Petty Cash (%), Other (%)

3. **Budget vs Actual** (if budget configured) -- Bar chart comparing budgeted vs actual per category

**API Calls:**
- `GET /api/v1/finance/projects/{id}/wallet`
- `GET /api/v1/finance/projects/{id}/financial-health`
- `GET /api/v1/finance/projects/{id}/budget-vs-actual`

**CLIENT view:** Shows only Total Value, Total Paid, Remaining. No spend breakdown (internal data).

---

#### Screen 33: Transaction List

**Route:** `/(tabs)/finance` (Manager/Admin) or within Project Finance tab
**Roles:** MANAGER, SUPER_ADMIN
**Header:** "Transactions" with filter icon

**Layout:**
- **Filter bar** -- Segmented control: "All" | "Inflows" | "Outflows"
- **Sub-filters** (bottom sheet on filter icon tap): source (CLIENT / VENDOR / LABOR / PETTY_CASH), status (PENDING / CLEARED / REJECTED), date range, project
- **Transaction list** -- Each row:
  - Direction icon: green up arrow (INFLOW) / red down arrow (OUTFLOW)
  - Description (1 line, truncated)
  - Amount (green for in, red for out)
  - Project name (small, muted)
  - Source badge (CLIENT / VENDOR / LABOR)
  - Status badge (PENDING: amber, CLEARED: green, REJECTED: red)
  - Date
  - Tappable: expands inline to show full description, reference ID, proof document link, recorded by

**API Calls:**
- `GET /api/v1/finance/transactions?category={filter}&source={source}&status={status}&project_id={id}&date_from={date}&date_to={date}&skip={offset}&limit=20`

**Infinite scroll:** Pagination as user scrolls.

---

#### Screen 34: Record Payment

**Route:** Bottom sheet from Transaction List or Dashboard
**Roles:** MANAGER, SUPER_ADMIN, SALES
**Header:** "Record Transaction"

**Layout (form in bottom sheet):**

1. **Category** -- Segmented: "Money In" (INFLOW) | "Money Out" (OUTFLOW)
2. **Project Picker** -- Required
3. **Source** -- Dropdown: CLIENT / VENDOR / LABOR / PETTY_CASH (filtered by category)
4. **Amount** -- Currency input with Rs. prefix
5. **Description** -- Text input: "Cheque from client" / "Plumber payment" / etc.
6. **Reference ID** (optional) -- Bank reference number, cheque number
7. **Proof Document** -- Camera or gallery to capture receipt/cheque photo
8. **Submit** -- "Record Transaction"

**API Calls:**
- `POST /api/v1/upload` (category: "finance") -- receipt photo
- `POST /api/v1/finance/transactions`

**Business Rules:**
- OUTFLOW triggers the spending lock check. If wallet balance insufficient, API returns 402. Show error: "Insufficient project funds."
- INFLOW with category CLIENT creates a PENDING transaction that needs manager verification.

---

#### Screen 35: Approve Transaction

**Route:** From Notification deep link or Pending Approvals section on Dashboard
**Roles:** MANAGER, SUPER_ADMIN

**Layout (bottom sheet):**
- Transaction detail: amount, description, project, source, reference, proof image (tappable for zoom)
- **Approve button** (green) -- calls `PATCH /api/v1/finance/transactions/{id}/verify`
- **Reject button** (red) -- note: rejection is not currently in the API; this would set status to REJECTED if the endpoint is added

**Swipe interaction:** On the dashboard, pending transactions can be swiped right to approve (with haptic confirmation).

---

#### Screen 36: Client Payment (Razorpay)

**Route:** `/(tabs)/payments/pay` (CLIENT tab)
**Roles:** CLIENT
**Header:** "Make Payment"

**Layout:**
1. **Project summary** -- Project name, total value, paid so far, remaining
2. **Amount field** -- Pre-filled with next milestone amount (if milestone structure configured), or editable
3. **Pay Now button** -- "Pay Rs. {amount}"
4. On tap: initiates Razorpay checkout

**Razorpay Flow:**
1. `POST /api/v1/payments/create-order` with `{ project_id, amount }` -- gets razorpay_order_id
2. Open Razorpay checkout (react-native-razorpay SDK) with order_id, key_id, amount, currency
3. On Razorpay success callback: `POST /api/v1/payments/verify` with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, project_id, amount }`
4. On verify success: show green checkmark animation, "Payment successful! Rs. {amount} credited to your project."
5. On failure: "Payment verification failed. If money was deducted, it will be refunded within 5-7 business days."

**Offline:** Payment button disabled with "You must be online to make payments."

---

### 5.10 Notification Screens

---

#### Screen 37: Notification Center

**Route:** `/(tabs)/notifications` or `/(tabs)/home` (notification bell tap)
**Roles:** All roles
**Header:** "Notifications" with "Mark All Read" button (three-dot menu)

**Layout:**
- **Notification list** -- Grouped by date: "Today", "Yesterday", "Earlier this week"
- Each notification card:
  - Type icon (left): colored circle with icon matching type (bell for ALERT, check for APPROVAL_REQ, info for INFO, money for PAYMENT_RECEIVED)
  - Title (bold, 1 line)
  - Body (muted, 2 lines max)
  - Timestamp (relative: "2h ago")
  - Unread indicator: blue dot on left edge
  - Tappable: navigates to action_url (deep linked to relevant screen)
- Swipe right: mark as read

**API Calls:**
- `GET /api/v1/notifications?unread_only=false&skip={offset}&limit=20` -- paginated
- `PATCH /api/v1/notifications/{id}/read` -- on tap or swipe
- `POST /api/v1/notifications/mark-all-read` -- from menu

**Polling:** `GET /api/v1/notifications/unread-count` polled every 60 seconds when app is foregrounded. TanStack Query `refetchInterval: 60000`.

**Empty State:** "All caught up! No notifications." with a checkmark illustration.

---

#### Screen 38: Notification Detail (via Deep Link)

**Implementation:** Not a separate screen. When a notification is tapped:
1. Mark it as read (`PATCH /api/v1/notifications/{id}/read`)
2. Parse the `action_url` field
3. Navigate to the corresponding screen using Expo Router's `router.push()`

**Deep link mapping:**
- `/projects/{id}` -> Project Detail
- `/projects/{id}/finance` -> Project Finance tab
- `/quotes/{id}` -> Quote Detail
- `/leads/{id}` -> Lead Detail
- `/approvals` -> Pending Approvals (admin)
- `/material-requests/{id}` -> Material Request detail

---

### 5.11 Profile & Settings Screens

---

#### Screen 39: My Profile

**Route:** `/(tabs)/profile`
**Roles:** All roles
**Header:** "Profile"

**Layout:**
1. **Avatar section** -- Large circular avatar (from user.avatar_url or first-letter fallback). Tappable to change: camera or gallery picker. Uploads via `POST /api/v1/upload` (category: "avatars").
2. **User info card:**
   - Full name (editable inline, pencil icon)
   - Email (read-only)
   - Phone (editable inline)
   - Role badge (read-only)
   - Organization name
3. **Change Password** -- Tappable row, opens bottom sheet:
   - Current password field
   - New password field (with strength indicator)
   - Confirm password field
   - "Update Password" button
4. **Switch Organization** -- Shown only if user has multiple org memberships. Tappable row, navigates to Org Selector.
5. **App Settings** -- Tappable row, navigates to Settings screen.
6. **Sign Out** -- Red text button at bottom. Confirmation dialog: "Are you sure you want to sign out?"

**API Calls:**
- `GET /api/v1/auth/me` -- profile data
- `POST /api/v1/upload` -- avatar upload
- `PATCH /api/v1/users/{id}` -- update name/phone (currently admin-only, may need a self-update endpoint)
- `POST /api/v1/auth/switch-org` -- org switch

---

#### Screen 40: App Settings

**Route:** `/(tabs)/profile/settings`
**Roles:** All roles
**Header:** Back arrow, "Settings"

**Layout:**
1. **Push Notifications** -- Toggle switch. When enabled, registers device token with backend. Per-type toggles:
   - New lead assigned (SALES/BDE)
   - Quote needs approval (MANAGER)
   - Payment received (MANAGER)
   - Daily log submitted (MANAGER)
   - Attendance reminder (SUPERVISOR)
   - Follow-up reminder (SALES)
   - Sprint delayed (MANAGER)
   - Project milestone (CLIENT)

2. **Biometric Lock** -- Toggle switch. "Use Face ID / Fingerprint to unlock app"
   - When toggling on: prompt biometric to confirm
   - When toggling off: prompt biometric to confirm identity

3. **Appearance** -- Segmented control: "Light" | "Dark" | "System"

4. **Offline Mode** -- Toggle: "Cache data for offline use". Shows current cache size (e.g., "127 MB"). "Clear Cache" button.

5. **Language** (future) -- "English" (only option for now)

**Storage:** Settings persisted to AsyncStorage (not server).

---

#### Screen 41: About & Help

**Route:** `/(tabs)/profile/about`
**Roles:** All roles
**Header:** Back arrow, "About"

**Layout:**
1. App logo and name
2. Version number (from app.json)
3. Build number
4. **Support Contact:**
   - Email: support@igolo.app (tappable -> email app)
   - Phone: (tappable -> dialer)
5. **Links:**
   - "Privacy Policy" (opens web browser)
   - "Terms of Service" (opens web browser)
   - "Documentation" (opens web browser -> igolo.app/documentation)
6. **Debug Info (hidden):**
   - Tap version number 7 times to reveal: device ID, push token, API base URL, token expiry. Useful for support troubleshooting.

---

#### Screen 42: Switch Organization

**Route:** Reuses Org Selector screen (Screen 3) with back navigation
**Roles:** Users with multiple org memberships

**Implementation:** Same as Org Selector but navigated from Profile > "Switch Organization" rather than during login. Uses `POST /api/v1/auth/switch-org` instead of `POST /api/v1/auth/select-org`. On success, entire app state is reset and reloaded for the new org context.

---

## 6. Offline-First Features

### 6.1 Architecture Overview

The offline system uses a three-layer approach:

1. **TanStack Query Cache** -- Automatic caching of all GET responses. Configurable `staleTime` (5 minutes for most screens, 30 seconds for financial data) and `gcTime` (1 hour). Serves stale data when offline.

2. **Zustand Draft Store** -- Persisted to AsyncStorage via the Zustand `persist` middleware. Stores user-created drafts (leads, daily logs, attendance entries) that haven't been synced to the server.

3. **Offline Queue** -- A FIFO queue (stored in AsyncStorage) of pending write operations. Each entry contains: API endpoint, method, payload, local file paths (for photos), retry count, created timestamp.

### 6.2 Offline-Capable Operations

| Operation | Local Storage | Sync Behavior |
|-----------|--------------|---------------|
| Create Lead | draftStore: full lead payload | POST to /crm/leads on reconnect. On success, replace draft with server response. On conflict (409), flag for user resolution. |
| Add Lead Activity | offlineQueue: activity payload | POST to /crm/leads/{id}/activities. Order-preserving sync. |
| Submit Daily Log | draftStore: log payload + local photo paths | Upload photos first (POST /upload), then POST log with server photo URLs. If photo upload fails, retry 3 times, then submit log without failed photos. |
| Mark Attendance | draftStore: attendance payload + optional local photo | POST to /labor/attendance. If duplicate detected (same team+project+date), flag for user review. |
| Material Indent Request | offlineQueue: request payload | POST to /material-requests/. Items resolved by cached item_ids. |

### 6.3 Sync Manager

```
useOfflineSync hook:
  - Runs when app transitions from offline to online (NetInfo listener)
  - Also runs on app foreground (AppState listener) if queue is non-empty
  - Processes queue items in FIFO order
  - Each item: attempt API call
    - Success: remove from queue, invalidate relevant TanStack Query cache
    - Failure (4xx): mark as "Failed" with error message, show in a "Sync Issues" screen
    - Failure (5xx / network): increment retry count, keep in queue, try next item
  - Maximum 3 retries per item before marking as "Failed"
  - Show "Syncing X items..." toast while processing
  - Show "All synced!" toast on completion
```

### 6.4 Offline UI Indicators

- **Global banner** -- When offline, show a persistent amber banner below the header: "You're offline" with a WiFi-off icon. Banner dismisses with slide-up animation when reconnected, replaced briefly by "Back online -- syncing..." (green).
- **Draft badges** -- Items in the draft store show a "Draft" badge (gray tag) and a sync icon (rotating arrows when syncing, checkmark when synced, exclamation for failed).
- **Disabled states** -- Features that require real-time data show disabled button state with tooltip: "Requires internet connection"

### 6.5 Storage Limits

- Maximum offline photo storage: 500 MB. When exceeded, oldest photos are purged (but the log text is preserved).
- Maximum draft items: 50. When exceeded, show warning: "Offline storage is full. Connect to sync your data."
- Cache eviction: TanStack Query gcTime ensures stale cache is garbage-collected after 1 hour of no use.

---

## 7. Push Notification Strategy

### 7.1 Registration Flow

1. On first successful login, request notification permissions (iOS requires explicit permission, Android grants by default)
2. If granted, register with Expo Push service to obtain an `ExpoPushToken`
3. Store the token on the backend: `POST /api/v1/users/me/device-token` (new endpoint needed, or piggyback on an existing update endpoint)
4. Token is refreshed on each app launch

### 7.2 Notification Events

| Event | Recipients | Priority | Sound | Badge |
|-------|-----------|----------|-------|-------|
| New lead assigned | Assigned SALES/BDE user | High | Default | +1 |
| Lead status changed to CONVERTED | Assigned SALES/BDE + MANAGER | Normal | Default | +1 |
| Quote needs approval | All MANAGER users in org | High | Urgent tone | +1 |
| Quote approved/rejected | Quote creator (SALES) | High | Default | +1 |
| Payment received (client) | MANAGER + SALES who owns lead | High | Cash register | +1 |
| Sprint status changed to DELAYED | Project MANAGER | High | Alert tone | +1 |
| Daily log submitted | Project MANAGER | Normal | None | +1 |
| Attendance reminder (9:00 AM daily) | All SUPERVISOR users | Normal | Default | 0 |
| Follow-up reminder (based on scheduled date) | Assigned SALES/BDE | Normal | Default | +1 |
| Material request submitted | MANAGER | Normal | Default | +1 |
| Material request approved/rejected | Requesting SUPERVISOR | Normal | Default | +1 |
| Project milestone reached (sprint completed) | CLIENT | Normal | Celebration | +1 |
| Budget threshold crossed (>70% spent) | Project MANAGER + SUPER_ADMIN | High | Alert tone | +1 |
| Payroll pending (every Saturday 10 AM) | MANAGER | Normal | Default | +1 |
| New site photo (daily log) | CLIENT (if visible_to_client) | Low | None | +1 |
| Trial expiring (3 days before) | SUPER_ADMIN | High | Default | +1 |
| Trial expiring (1 day before) | SUPER_ADMIN | High | Urgent tone | +1 |

### 7.3 Notification Payload Structure

```json
{
  "to": "ExpoPushToken[xxx]",
  "title": "Payment Received",
  "body": "Rs. 5,00,000 received for Villa 402 from Anita Sharma",
  "data": {
    "type": "PAYMENT_RECEIVED",
    "action_url": "/projects/abc-123/finance",
    "project_id": "abc-123",
    "amount": 500000
  },
  "sound": "default",
  "badge": 1,
  "priority": "high",
  "channelId": "finance"
}
```

### 7.4 Notification Channels (Android)

| Channel ID | Name | Importance | Vibration | Sound |
|------------|------|------------|-----------|-------|
| `approvals` | Approvals | High | Yes | Urgent |
| `finance` | Payments & Finance | High | Yes | Default |
| `leads` | Lead Updates | Default | Yes | Default |
| `projects` | Project Updates | Default | Yes | Default |
| `attendance` | Attendance Reminders | Default | No | Default |
| `general` | General | Low | No | None |

### 7.5 Notification Handling in App

```
Push Received (app in foreground):
  - Show in-app toast notification at top of screen (dismissible)
  - Increment badge count in tab bar
  - DO NOT show system notification (avoids double notification)

Push Received (app in background / killed):
  - Show system notification
  - Tapping notification opens app and deep links to action_url

Badge Management:
  - Badge count = unread notification count from API
  - Reset badge to 0 when Notification Center is opened
  - Platform badge (app icon) updated on each push
```

---

## 8. Mobile-Specific UX Patterns

### 8.1 Gesture Interactions

| Gesture | Context | Action |
|---------|---------|--------|
| Pull-to-refresh | All list screens | Reload data from API, clear stale cache |
| Swipe right on card | Lead card | Quick call (opens dialer with contact number) |
| Swipe left on card | Lead card | Quick WhatsApp (opens WhatsApp with number) |
| Swipe right on notification | Notification card | Mark as read |
| Swipe right on approval | Pending approval card | Approve (with haptic + confirmation) |
| Swipe left on approval | Pending approval card | Reject (with haptic + confirmation) |
| Long-press on card | Most list items | Context menu: Copy number, Share, View details, Delete (where applicable) |
| Pinch-to-zoom | Photo gallery, PDF viewer, Timeline | Zoom in/out |
| Drag sprint bar edge | Timeline (MANAGER) | Extend/shorten sprint duration |

### 8.2 Haptic Feedback

- **Light impact:** Button taps, tab switches, card taps
- **Medium impact:** Swipe action triggers (approve, reject)
- **Success haptic:** Form submission success, payment confirmation
- **Error haptic:** Form validation failure, insufficient funds
- **Selection haptic:** Picker value changes, stepper increment/decrement

### 8.3 Modal Patterns

- **Bottom sheets** -- Used for: filters, forms (activity log, attendance, record payment, approve/reject), context menus. Height: 40-80% of screen. Dismissible by swipe-down or tap outside.
- **Full-screen modals** -- Used for: photo gallery, PDF viewer, Razorpay checkout, camera capture. Always have a close (X) button top-left or top-right.
- **Alert dialogs** -- Used for: destructive confirmations, sign out, finalize quote. Standard platform dialog.

### 8.4 Camera Integration

**Photo capture flow:**
1. User taps "Add Photo" or camera icon
2. Action sheet appears: "Take Photo" | "Choose from Gallery" | "Cancel"
3. **Take Photo:** Opens expo-camera with:
   - Rear camera default
   - Flash toggle
   - Capture button
   - Preview after capture: "Use Photo" / "Retake"
4. **Choose from Gallery:** Opens expo-image-picker with multi-select (up to 10 photos)
5. Selected photos compressed to max 1080px longest edge, JPEG quality 80%
6. Thumbnails shown in horizontal scroll row with remove (X) button per photo
7. Photos uploaded to server in background after form submission

### 8.5 Voice-to-Text

- Available on: Notes fields (daily log, lead activity, lead creation)
- Implementation: Uses platform native speech recognition via `expo-speech` or `@react-native-voice/voice`
- UI: Microphone icon button next to text field. Pulsing animation while listening. Text appears in real-time in the field.
- Language: English (default), Hindi (if platform supports)

### 8.6 Quick Actions (App Shortcuts)

**iOS Home Screen Quick Actions (3D Touch / Haptic Touch):**
- "New Lead" -- navigates directly to lead creation form
- "Daily Log" -- navigates to daily log submission (Supervisor only)
- "Scan Attendance" -- navigates to attendance marking (Supervisor only)

**Android App Shortcuts:**
- Same three shortcuts as iOS

### 8.7 Deep Linking

**URL Scheme:** `igolo://`
**Universal Links:** `https://{slug}.igolo.app/mobile/...`

**Supported deep links:**
- `igolo://leads/{id}` -> Lead Detail
- `igolo://quotes/{id}` -> Quote Detail
- `igolo://projects/{id}` -> Project Detail
- `igolo://projects/{id}/finance` -> Project Finance
- `igolo://projects/{id}/timeline` -> Sprint Timeline
- `igolo://notifications` -> Notification Center
- `igolo://attendance` -> Mark Attendance
- `igolo://daily-log` -> Submit Daily Log

### 8.8 Loading States

- **Skeleton screens** (NOT spinners) for all list and detail screens. Use the same card layout with animated gray placeholder blocks for text and images.
- **Inline loading** for actions: buttons show a spinner replacing the label, button is disabled during loading
- **Progressive loading:** Show data as it arrives. If project detail loads before daily logs, render the project card immediately and show skeleton for the logs section.

### 8.9 Error Handling

| Error Type | UI Treatment |
|------------|-------------|
| Network error (no internet) | Amber banner: "You're offline". Cached data shown if available. |
| API 400 (validation) | Inline field errors below the relevant input. Toast for non-field errors. |
| API 401 (unauthorized) | Silent token refresh. If refresh fails, navigate to login. |
| API 402 (insufficient funds) | Bottom sheet: "Insufficient project funds. Balance: Rs. X. Required: Rs. Y." with "Request Top-up" CTA. |
| API 403 (forbidden) | Full-screen "Access Denied" with "Go Back" button. |
| API 404 (not found) | Full-screen "Not Found" with "Go Back" button and illustration. |
| API 409 (conflict) | Toast: "This record already exists" with link to existing item. |
| API 429 (rate limited) | Toast: "Too many requests. Try again in a moment." |
| API 500+ (server error) | Toast: "Something went wrong. Try again." with "Retry" button. |
| Timeout (>10s) | Toast: "Request timed out. Check your connection." with "Retry" button. |

---

## 9. Design System

### 9.1 Color Palette

**Light Mode:**

| Token | HSL | Hex (approx) | Usage |
|-------|-----|------|-------|
| `--primary` | 222.2 47.4% 11.2% | #0F172A | Primary text, buttons, active states |
| `--primary-foreground` | 210 40% 98% | #F8FAFC | Text on primary backgrounds |
| `--background` | 0 0% 100% | #FFFFFF | Screen backgrounds |
| `--foreground` | 222.2 84% 4.9% | #020817 | Primary body text |
| `--muted` | 210 40% 96.1% | #F1F5F9 | Muted backgrounds, disabled states |
| `--muted-foreground` | 215.4 16.3% 46.9% | #64748B | Secondary text, captions |
| `--accent` | 210 40% 96.1% | #F1F5F9 | Accent backgrounds |
| `--destructive` | 0 84.2% 60.2% | #EF4444 | Errors, delete actions |
| `--border` | 214.3 31.8% 91.4% | #E2E8F0 | Card borders, dividers |

**Status Colors:**

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| Active / Success / Approved | Green | #22C55E | Active sprint, cleared transaction, approved items |
| Pending / Warning | Amber | #F59E0B | Pending approval, sent quote, caution alerts |
| Error / Delayed / Rejected | Red | #EF4444 | Delayed sprint, rejected items, over budget |
| Draft / Neutral | Gray | #94A3B8 | Draft quotes, pending states |
| Info | Blue | #3B82F6 | Informational badges, active sprint |

**Brand Accent:** The Igolo Interior brand uses a gold/champagne accent (#CBB282) for the logo and premium UI elements. Use sparingly for: app icon, splash screen, promotional banners.

**Dark Mode:**
- Invert the semantic tokens following the existing web app dark mode (defined in globals.css `:root.dark`)
- `--background`: 222.2 84% 4.9% (#020817)
- `--foreground`: 210 40% 98% (#F8FAFC)
- `--primary`: 210 40% 98%
- Card backgrounds: slightly lighter than screen background

### 9.2 Typography

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| Display | Inter | 28px | 700 (Bold) | 34px | Screen titles, large numbers |
| Heading 1 | Inter | 24px | 700 | 30px | Section headers |
| Heading 2 | Inter | 20px | 600 (SemiBold) | 26px | Card titles |
| Heading 3 | Inter | 18px | 600 | 24px | Subsection headers |
| Body | Inter | 16px | 400 (Regular) | 22px | Primary body text |
| Body Small | Inter | 14px | 400 | 20px | Secondary text, captions |
| Caption | Inter | 12px | 500 (Medium) | 16px | Timestamps, badges, metadata |
| Label | Inter | 14px | 500 | 18px | Form labels, button text |
| Mono | JetBrains Mono | 14px | 400 | 20px | Reference IDs, amounts |

**Font Loading:** Use `expo-font` to load Inter from Google Fonts. Fallback to system font during loading.

### 9.3 Iconography

- **Primary set:** Lucide React Native (`lucide-react-native`)
- **Icon size:** 20px (in-text), 24px (buttons and nav), 32px (feature icons), 48px (empty states)
- **Icon color:** Matches text color of context (foreground for body, muted-foreground for secondary, white for filled buttons)
- **Status icons:** Consistent across the app:
  - Active: `CheckCircle` (green)
  - Pending: `Clock` (amber)
  - Delayed: `AlertTriangle` (red)
  - Draft: `FileEdit` (gray)

### 9.4 Component Patterns

**Cards:**
- Border radius: 12px
- Padding: 16px
- Background: white (light) / card color (dark)
- Shadow: `0 1px 3px rgba(0,0,0,0.1)` (light mode), no shadow (dark mode, use border instead)
- Margin between cards: 12px

**Buttons:**
- Primary: filled with `--primary` color, white text, rounded 8px, height 48px, full-width for form submissions
- Secondary: outlined with `--primary` border and text, transparent fill, same dimensions
- Destructive: filled with `--destructive`, white text
- Ghost: no background, `--primary` text, for inline actions
- Icon button: 44x44px touch target minimum (accessibility)

**Badges / Status Tags:**
- Border radius: 6px
- Padding: 4px 8px
- Font: Caption style (12px, medium weight)
- Background: Status color at 15% opacity
- Text: Status color at 100%

**Input Fields:**
- Height: 48px
- Border: 1px `--border`
- Border radius: 8px
- Focus: 2px `--primary` border
- Error: 2px `--destructive` border + error text below (12px, red)
- Padding: 12px horizontal

**Bottom Sheets:**
- Handle bar at top (40px wide, 4px tall, gray, centered)
- Border radius top: 16px
- Background: `--background`
- Backdrop: black at 50% opacity
- Snap points: 40%, 60%, 80% of screen height

### 9.5 Spacing Scale

- 4px -- Tight spacing (icon-to-text gap)
- 8px -- Small spacing (between related elements)
- 12px -- Medium spacing (between cards in a list)
- 16px -- Standard spacing (card padding, section gaps)
- 24px -- Large spacing (between sections)
- 32px -- Extra large (before/after major sections)

### 9.6 Animation & Motion

- **Duration:** 200ms for micro-interactions (button press, toggle), 300ms for transitions (sheet open, page change), 500ms for celebrations (checkmark, confetti)
- **Easing:** `Easing.bezier(0.25, 0.1, 0.25, 1)` (ease-out) for most transitions
- **Reanimated 3** for gesture-driven animations (swipe actions, sheet drag)
- **Skeleton shimmer:** Left-to-right gradient sweep, 1.5s cycle, `Animated.loop`

---

## 10. API Endpoints Used Per Screen

This section maps every screen to its exact API calls. All endpoints are prefixed with `/api/v1`.

### Auth Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Login | `/auth/token` | POST | Authenticate user |
| Login | `/auth/me` | GET | Fetch user profile + org memberships |
| Forgot Password | `/auth/forgot-password` | POST | Request reset email |
| Org Selector | `/auth/select-org` | POST | Select org context |
| Org Switch | `/auth/switch-org` | POST | Switch active org |
| Token Refresh | `/auth/refresh` | POST | Refresh expired access token |

### Dashboard Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Admin Dashboard | `/notifications/unread-count` | GET | Badge count |
| Admin Dashboard | `/finance/summary` | GET | Revenue KPIs |
| Admin Dashboard | `/projects?status=IN_PROGRESS` | GET | Active project count |
| Admin Dashboard | `/crm/leads` | GET | Open lead count |
| Admin Dashboard | `/approvals/pending` | GET | Pending approvals |
| Admin Dashboard | `/finance/transactions?limit=5` | GET | Recent transactions |
| Sales Dashboard | `/crm/leads?assigned_to={user_id}` | GET | My leads + follow-ups |
| Sales Dashboard | `/quotes?limit=3` | GET | Recent quotes |
| Supervisor Dashboard | `/projects` | GET | Assigned project |
| Supervisor Dashboard | `/labor/attendance?date_from={today}&date_to={today}` | GET | Today's attendance check |
| Supervisor Dashboard | `/projects/{id}/daily-logs?limit=1` | GET | Today's log check |
| Supervisor Dashboard | `/material-requests/?project_id={id}` | GET | Pending material requests |
| Client Dashboard | `/projects` | GET | My project |
| Client Dashboard | `/projects/{id}` | GET | Project with sprints |
| Client Dashboard | `/finance/projects/{id}/wallet` | GET | Financial summary |
| Client Dashboard | `/projects/{id}/daily-logs?visible_to_client=true&limit=3` | GET | Recent updates |

### Lead Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Lead List | `/crm/leads?status={filter}&skip={n}&limit=20` | GET | Paginated lead list |
| Lead Detail | `/crm/leads/{id}` | GET | Lead data |
| Lead Detail | `/crm/leads/{id}/activities` | GET | Activity feed |
| Lead Detail | `/quotes?lead_id={id}` | GET | Linked quotations |
| Create Lead | `/crm/leads` | POST | Create lead |
| Update Lead | `/crm/leads/{id}` | PUT | Update lead |
| Convert Lead | `/crm/leads/{id}/convert` | POST | Convert to client |
| Add Activity | `/crm/leads/{id}/activities` | POST | Log activity |
| Pipeline | `/crm/leads?limit=200` | GET | All leads for Kanban |

### Quotation Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Quote List | `/quotes?status={filter}&skip={n}&limit=20` | GET | Paginated quote list |
| Quote Detail | `/quotes/{id}` | GET | Full quote with rooms/items |
| Finalize Quote | `/quotes/{id}/finalize` | POST | Freeze as version |
| Update Status | `/quotes/{id}/status` | PATCH | Approve/reject/send |
| Download PDF | `/quotes/{id}/pdf` | GET | PDF binary |
| Send to Client | `/quotes/{id}/send` | POST | Email quote PDF |
| Create Quote | `/quotes` | POST | Create new draft |
| Quick Quote | `/inventory/items` | GET | Item picker data |

### Project Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Project List | `/projects?status={filter}&skip={n}&limit=20` | GET | Paginated projects |
| Project Detail | `/projects/{id}` | GET | Project with sprints |
| Project Detail | `/finance/projects/{id}/wallet` | GET | Wallet data |
| Project Detail | `/finance/projects/{id}/transactions?limit=10` | GET | Recent transactions |
| Project Detail | `/projects/{id}/daily-logs?limit=20` | GET | Daily logs |
| Project Detail | `/projects/{id}/variation-orders` | GET | Variation orders |
| Update Sprint | `/projects/{id}/sprints/{sprint_id}` | PATCH | Update status/dates |
| Update Project | `/projects/{id}` | PATCH | Update project details |
| Create VO | `/projects/{id}/variation-orders` | POST | New variation order |
| Update VO | `/projects/{id}/variation-orders/{vo_id}` | PATCH | Approve/reject VO |
| Project P&L | `/projects/{id}/pnl` | GET | Profit & loss |
| Project Materials | `/projects/{id}/materials` | GET | Linked materials |

### Daily Log Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Submit Daily Log | `/upload` | POST | Upload photos |
| Submit Daily Log | `/projects/{id}/daily-logs` | POST | Submit log entry |
| Daily Log History | `/projects/{id}/daily-logs?sprint_id={id}&skip={n}&limit=10` | GET | Feed data |

### Attendance Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Mark Attendance | `/labor/teams` | GET | Team picker data |
| Mark Attendance | `/upload` | POST | Upload site photo |
| Mark Attendance | `/labor/attendance` | POST | Submit attendance |
| Attendance History | `/labor/attendance?project_id={id}&date_from={d}&date_to={d}&status={s}` | GET | Filtered logs |
| Payroll Summary | `/labor/payroll?week_start={d}&week_end={d}` | GET | Weekly summary |
| Approve Payroll | `/labor/payroll/approve?project_id={id}&team_id={id}&week_start={d}&week_end={d}` | POST | Approve batch |

### Material Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Material Indent | `/inventory/items?search={q}` | GET | Item search |
| Material Indent | `/material-requests/` | POST | Submit request |
| Indent History | `/material-requests/?project_id={id}&status={s}` | GET | Request list |
| Approve Indent | `/material-requests/{id}/approve` | PATCH | Approve request |
| Reject Indent | `/material-requests/{id}/reject` | PATCH | Reject request |
| Fulfill Indent | `/material-requests/{id}/fulfill` | POST | Issue from warehouse |

### Finance Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Wallet Overview | `/finance/projects/{id}/wallet` | GET | Wallet state |
| Wallet Overview | `/finance/projects/{id}/financial-health` | GET | Health metrics |
| Wallet Overview | `/finance/projects/{id}/budget-vs-actual` | GET | Budget comparison |
| Transaction List | `/finance/transactions?category={c}&source={s}&status={st}&project_id={p}&date_from={d}&date_to={d}&skip={n}&limit=20` | GET | Filtered transactions |
| Record Transaction | `/upload` | POST | Receipt photo |
| Record Transaction | `/finance/transactions` | POST | Create transaction |
| Verify Transaction | `/finance/transactions/{id}/verify` | PATCH | Approve/clear |
| Financial Summary | `/finance/summary` | GET | Aggregated totals |
| Source Breakdown | `/finance/breakdown/source` | GET | By-source totals |
| Project Breakdown | `/finance/breakdown/project` | GET | By-project totals |

### Payment Screens (Client)

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Client Payment | `/payments/create-order` | POST | Razorpay order |
| Client Payment | `/payments/verify` | POST | Verify + record |

### Notification Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| Notification Center | `/notifications?unread_only={bool}&skip={n}&limit=20` | GET | Notification list |
| Unread Count (polling) | `/notifications/unread-count` | GET | Badge count |
| Mark Read | `/notifications/{id}/read` | PATCH | Single read |
| Mark All Read | `/notifications/mark-all-read` | POST | Bulk read |

### Profile Screens

| Screen | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| My Profile | `/auth/me` | GET | Profile data |
| Update Avatar | `/upload` | POST | Avatar upload |
| Switch Org | `/auth/switch-org` | POST | Change org context |
| Org Settings | `/org/settings` | GET | Org info |
| Org Usage | `/org/usage` | GET | Plan limits |

---

## 11. Performance Targets

### 11.1 Launch Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold start to splash screen | < 500ms | Time from app icon tap to splash visible |
| Cold start to usable (login screen or dashboard) | < 2 seconds | Time from icon tap to interactive screen |
| Warm start (from background) | < 500ms | Time from app switch to usable |
| Biometric unlock | < 1 second | Time from biometric prompt to dashboard |

### 11.2 Runtime Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response display (with skeleton) | < 500ms | Time from screen mount to data rendered |
| List scroll FPS | 60 FPS | No frame drops during scroll |
| Photo capture to preview | < 1 second | Time from shutter tap to preview display |
| Photo upload (single, 1080p JPEG) | < 3 seconds on 4G | Background upload with progress |
| Offline to online sync | < 30 seconds | Time from reconnection to queue fully processed |
| Tab switch | < 100ms | Navigation transition duration |
| Bottom sheet open | < 200ms | Sheet animation duration |
| Pull-to-refresh data reload | < 1 second | Skeleton visible for < 1 second on fast connection |

### 11.3 Bundle Size

| Metric | Target |
|--------|--------|
| iOS IPA size | < 50 MB (download) |
| Android APK size | < 40 MB (download) |
| Android AAB size | < 30 MB (download from Play Store, with dynamic delivery) |
| JavaScript bundle | < 5 MB (Hermes bytecode) |
| OTA update size | < 2 MB (typical delta) |

### 11.4 Memory & Battery

| Metric | Target |
|--------|--------|
| Memory usage (idle on dashboard) | < 150 MB |
| Memory usage (photo gallery, 50 images) | < 300 MB |
| Background battery drain | Negligible (no background processes except push) |
| GPS/Location usage | None (not required for MVP features) |

### 11.5 Caching Strategy

| Data Type | staleTime | gcTime | Refetch Trigger |
|-----------|-----------|--------|-----------------|
| User profile (/auth/me) | 5 minutes | 1 hour | App foreground, org switch |
| Lead list | 2 minutes | 30 minutes | Pull-to-refresh, new lead created |
| Lead detail | 5 minutes | 30 minutes | Pull-to-refresh, activity added |
| Quote list | 2 minutes | 30 minutes | Pull-to-refresh, status change |
| Project list | 5 minutes | 1 hour | Pull-to-refresh |
| Project detail (with sprints) | 5 minutes | 1 hour | Pull-to-refresh, sprint update |
| Daily logs | 2 minutes | 30 minutes | New log submitted |
| Transaction list | 30 seconds | 15 minutes | New transaction, verification |
| Wallet data | 30 seconds | 15 minutes | Transaction change |
| Notification count | 60 seconds (polling) | 5 minutes | Push received |
| Inventory items | 10 minutes | 2 hours | Rarely changes |
| Labor teams | 10 minutes | 2 hours | Rarely changes |

---

## 12. Release Strategy

### 12.1 Phase 1 -- MVP (Weeks 1-4)

**Goal:** Core workflows for Sales and Managers. Get the app into daily use.

**Screens delivered:**
- Login, Forgot Password, Org Selector (Screens 1-3)
- Admin Dashboard, Sales Dashboard (Screens 4-5)
- Lead List, Lead Detail, Create Lead, Lead Activity Log (Screens 8-11)
- Quote List, Quote Detail, Quote PDF Preview, Share Quote (Screens 13-16)
- Notification Center (Screen 37)
- My Profile, App Settings, About (Screens 39-41)

**Technical deliverables:**
- Expo project setup with TypeScript, ESLint, Prettier
- Axios API client with JWT interceptor
- Zustand auth store with expo-secure-store
- TanStack Query provider and initial hooks
- Tab navigation (SALES/BDE and MANAGER variants)
- Push notification registration (receive only, backend integration follows)
- Skeleton loading component library
- Error boundary and error state components

**Not included in Phase 1:**
- Offline support
- Biometric auth
- Dark mode
- Camera integration (for site photos)

### 12.2 Phase 2 -- Project Execution (Weeks 5-8)

**Goal:** Enable Supervisors to go fully digital. Eliminate WhatsApp-based site updates.

**Screens delivered:**
- Supervisor Dashboard (Screen 6)
- Project List, Project Detail, Sprint Timeline, Sprint Detail (Screens 18-21)
- Add Daily Log, Daily Log History, Photo Gallery (Screens 23-25)
- Mark Attendance, Attendance History, Payroll Summary (Screens 26-28)
- Variation Order (Screen 22)
- Lead Pipeline Kanban (Screen 12)

**Technical deliverables:**
- Supervisor tab navigation variant
- Camera integration (expo-camera + expo-image-picker)
- Photo compression pipeline
- Background photo upload with progress
- Voice-to-text for notes
- Calendar view component (attendance history)
- Timeline/Gantt visualization component

### 12.3 Phase 3 -- Finance & Client Portal (Weeks 9-12)

**Goal:** Client self-service. Complete financial tracking on mobile.

**Screens delivered:**
- Client Dashboard (Screen 7)
- Project Wallet Overview, Transaction List, Record Payment, Approve Transaction (Screens 32-35)
- Client Payment / Razorpay (Screen 36)
- Material Indent Request, Indent History (Screens 29-30)
- Quick Quote (Screen 17)
- Switch Organization (Screen 42)

**Technical deliverables:**
- Client tab navigation variant
- Razorpay React Native SDK integration
- Chart components (doughnut, bar, line) for finance screens
- Swipe-to-approve gesture handling
- PDF generation/download for receipts
- Client-facing daily log feed (filtered by visible_to_client)

### 12.4 Phase 4 -- Polish & Offline (Weeks 13-14)

**Goal:** Production-ready quality. Offline support. App Store submission.

**Deliverables:**
- Offline draft system (leads, daily logs, attendance)
- Offline queue manager with sync indicators
- Biometric authentication (Face ID / Fingerprint)
- Dark mode support
- Push notification backend integration (all event types)
- iOS Home Screen Quick Actions
- Android App Shortcuts
- Deep linking full implementation
- Performance optimization pass (list virtualization, image caching, bundle splitting)
- Accessibility audit (screen reader labels, contrast ratios, touch targets)
- Crash reporting (Sentry React Native SDK)
- Analytics (Mixpanel or Amplitude for screen views, key actions)
- App Store screenshots and metadata preparation
- TestFlight / Google Play Internal Testing distribution
- Bug bash and QA cycle

### 12.5 Milestone Checkpoints

| Week | Milestone | Demo |
|------|-----------|------|
| Week 2 | Auth flow + basic navigation working | Login, see dashboard, switch tabs |
| Week 4 | Phase 1 complete | Full lead management + quote viewing on device |
| Week 6 | Camera + daily logs working | Supervisor can submit daily log with photos |
| Week 8 | Phase 2 complete | Full project execution workflow on device |
| Week 10 | Client portal + Razorpay working | Client can view project and make payment |
| Week 12 | Phase 3 complete | All screens built, all API integrations working |
| Week 13 | Offline mode working | Create lead offline, sync when online |
| Week 14 | App Store submission | Both iOS and Android submitted for review |

---

## 13. App Store Metadata

### 13.1 iOS App Store

**App Name:** Igolo Interior
**Subtitle:** Interior Design Project Manager
**Category:** Primary: Business, Secondary: Productivity
**Price:** Free (access controlled by backend subscription)
**Age Rating:** 4+ (no objectionable content)
**Privacy Policy URL:** https://igolo.app/privacy
**Support URL:** https://igolo.app/support

**Keywords:** interior design, project management, CRM, quotation builder, site tracking, construction management, contractor app, lead management, client portal, invoice

**Description:**
"Igolo Interior is the all-in-one project management app for interior design companies. Manage leads, create quotations, track project execution, handle finances, and keep clients informed -- all from your phone.

For Sales Teams: Capture leads on the go, share quotation PDFs via WhatsApp, and track your pipeline.

For Project Managers: Approve quotes and expenses, monitor project budgets, and track sprint timelines.

For Site Supervisors: Mark daily attendance, submit progress photos, and request materials -- replacing WhatsApp groups with structured tracking.

For Clients: View your project progress, browse site photos, check timelines, and make secure payments.

Features include role-based access, real-time notifications, offline support, and Razorpay payment integration."

**What's New (v1.0):** "Initial release. Manage your interior design business from your phone."

### 13.2 Google Play Store

**App Name:** Igolo Interior - Project Manager
**Short Description:** Interior design CRM, project tracking, and client portal
**Category:** Business
**Content Rating:** Everyone
**Privacy Policy:** Same URL

**Full Description:** Same as iOS with additional Play Store formatting (bullet points, line breaks).

### 13.3 Screenshots Required (6 per platform, per device size)

**iPhone 6.7" (iPhone 15 Pro Max) -- 6 screenshots:**
1. **Admin Dashboard** -- KPI cards, greeting, pending approvals visible
2. **Lead Pipeline** -- Kanban view showing leads across stages
3. **Quote Detail** -- Room breakdown, total amount, action buttons
4. **Sprint Timeline** -- Horizontal Gantt-style view of 6 sprints with today marker
5. **Daily Log Camera** -- Camera capture interface with photo thumbnails and notes field
6. **Client Payment** -- Razorpay checkout with project summary and amount

**iPhone 6.1" (iPhone 15) -- Same 6 screenshots at different resolution**

**iPad 12.9" -- Optional, 6 screenshots if iPad layout is supported**

**Android Phone -- 6 screenshots matching iOS content**

**Android Tablet -- Optional**

### 13.4 App Icon

- 1024x1024px (iOS) and 512x512px (Android)
- Design: Igolo Interior logo mark on the primary dark background (#0F172A)
- Rounded corners applied automatically by the OS
- No text in the icon (too small to read)

### 13.5 Splash Screen

- Full-screen Igolo Interior wordmark centered on primary dark background
- Animated fade-in (300ms) on launch
- Transitions to login/dashboard with a smooth cross-fade

---

## Appendix A: New API Endpoints Needed (Post-MVP)

The following endpoints do not exist in the current backend but would improve the mobile experience. These are NOT blockers for the MVP -- the app works without them.

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/users/me/device-token` | POST | Register push notification token | High (Phase 4) |
| `/users/me/update` | PATCH | Self-service profile update (name, phone, avatar) | Medium |
| `/crm/leads/count-by-status` | GET | Efficient pipeline counts without fetching all leads | Low |
| `/projects/dashboard-summary` | GET | Single endpoint returning all dashboard KPIs | Low |
| `/finance/transactions/{id}/reject` | PATCH | Reject a pending transaction (currently only verify exists) | Medium |

---

## Appendix B: Testing Strategy

### Unit Testing
- Jest + React Native Testing Library
- Test all form validation logic (Zod schemas)
- Test Zustand stores (auth state transitions, draft management)
- Test offline queue manager (enqueue, dequeue, retry logic)

### Integration Testing
- Test API client interceptors (token injection, 401 handling, refresh flow)
- Test TanStack Query hooks with MSW (Mock Service Worker)
- Test navigation flows (role-based tab rendering, deep linking)

### E2E Testing
- Detox (iOS) + Maestro (cross-platform)
- Critical paths: Login -> Dashboard -> Create Lead -> View Lead -> Add Activity
- Critical paths: Login -> Mark Attendance -> Submit Daily Log
- Critical paths (Client): Login -> View Project -> Make Payment

### Device Testing Matrix

| Device | OS | Priority |
|--------|----|----------|
| iPhone 15 Pro | iOS 17 | High |
| iPhone 13 | iOS 16 | High |
| iPhone SE (3rd gen) | iOS 15 | Medium (small screen) |
| Samsung Galaxy S24 | Android 14 | High |
| Samsung Galaxy A54 | Android 13 | High (mid-range) |
| Pixel 8 | Android 14 | Medium |
| OnePlus Nord | Android 12 | Medium |
| Redmi Note 13 | Android 13 | Medium (popular in India) |

---

## Appendix C: Security Considerations

1. **Token Storage:** All tokens stored in expo-secure-store (iOS Keychain / Android Keystore). Never in AsyncStorage.
2. **Certificate Pinning:** Not required for MVP. Consider for Phase 4+ if handling payment data directly.
3. **Jailbreak/Root Detection:** Not required for MVP. The backend enforces all authorization.
4. **Screenshot Prevention:** Not required. No highly sensitive data displayed (financials are business data, not personal banking data).
5. **Biometric Auth:** Uses expo-local-authentication which delegates to the OS secure enclave. The app never accesses biometric data directly.
6. **File Upload Validation:** All uploads go through the backend's `/upload` endpoint which validates file types and sizes. The mobile app additionally restricts to images (JPEG, PNG) and PDFs.
7. **Deep Link Validation:** All deep links first check authentication state. Unauthenticated deep links redirect to login and resume navigation after successful auth.

---

*End of document. This PRD is the single source of truth for the Igolo Interior mobile app development. All questions should be resolved by referencing this document first.*
