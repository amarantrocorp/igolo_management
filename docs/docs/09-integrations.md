# Integrations & Communications

This guide covers every external service and internal communication channel wired into the Igolo Interior ERP. Each section explains what the integration does, how to configure it, and how to verify it is working.

---

## Table of Contents

1. [Email System (SMTP)](#1-email-system-smtp)
2. [WhatsApp Business Integration](#2-whatsapp-business-integration)
3. [Razorpay Payment Gateway](#3-razorpay-payment-gateway)
4. [Google Maps / Places API](#4-google-maps--places-api)
5. [AI Floor Plan Analysis](#5-ai-floor-plan-analysis)
6. [Sentry Error Tracking](#6-sentry-error-tracking)
7. [Redis](#7-redis)
8. [Notification System](#8-notification-system)

---

## 1. Email System (SMTP)

The backend uses **FastAPI-Mail** with Jinja2 HTML templates to send transactional emails. Every email is sent asynchronously so API responses are never blocked by SMTP latency.

### Configuration

Add the following to your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your_app_password
EMAILS_FROM_NAME=Igolo Interior
```

| Variable | Description | Default |
|---|---|---|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for SSL) | `587` |
| `SMTP_USER` | Sender email address. Also used as the `MAIL_FROM` address. | (empty -- emails disabled) |
| `SMTP_PASSWORD` | App password or SMTP credential. For Gmail, generate an App Password in your Google Account security settings. | (empty) |
| `EMAILS_FROM_NAME` | Display name shown to recipients. | `IntDesignERP` |

When `SMTP_USER` is empty, all email-sending calls silently skip with a log message instead of raising errors. This lets the application run in development without an email provider.

### Email Templates

All templates live in `backend/app/templates/` and use Jinja2 syntax. The design language is **dark navy background with gold accent elements**, consistent branding across every message.

| # | Template File | Purpose | Trigger |
|---|---|---|---|
| 1 | `email_base.html` | Base layout shared by all emails. Contains the header with logo, footer with social links, and the `{% block content %}` placeholder. | Never sent directly; extended by all other templates. |
| 2 | `welcome.html` | Welcomes a new organization after registration. Includes workspace URL and getting-started steps. | Org registration (`POST /auth/register`). |
| 3 | `client_welcome.html` | Sends portal credentials to a newly created client user. Contains login URL and temporary password (if applicable). | Client user creation via the sales pipeline. |
| 4 | `new_lead.html` | Notifies a sales person that a new lead has been assigned to them. Shows lead name, contact, and source. | Lead creation or re-assignment (`POST /leads`, `PATCH /leads/{id}`). |
| 5 | `quotation_sent.html` | Full quotation summary sent to the client. Includes room-by-room breakdown table, total amount, and a CTA button to view/approve the quote online. | Quotation finalized and sent (`POST /quotes/{id}/send`). |
| 6 | `password_reset.html` | Password reset link with a 30-minute expiry countdown. Contains a single prominent reset button. | Password reset request (`POST /auth/forgot-password`). |
| 7 | `payment_confirmed.html` | Receipt-style confirmation showing amount, transaction reference, project name, and updated wallet balance. | Successful payment verification (Razorpay callback or manual entry approval). |
| 8 | `project_started.html` | Announces project kickoff with a 6-phase timeline visualization. Shows each sprint name and expected date range. | Project conversion from approved quotation (`POST /projects/convert/{quote_id}`). |
| 9 | `transaction_pending.html` | Approval request sent to managers when a new transaction is awaiting verification. | Manual payment entry or expense submission. |
| 10 | `variation_order.html` | Variation Order notification with a status badge (REQUESTED, APPROVED, REJECTED, PAID). Sent to both client and project manager. | VO creation or status change. |
| 11 | `generic_notification.html` | Catch-all template for any notification that does not have a dedicated template. Renders a title, body text, and optional action button. | Any `create_notification()` call that specifies this template. |

### How Emails Are Sent

There are two helpers in `backend/app/core/email.py`:

- **`send_email()`** -- async function that sends immediately. Used when you `await` the result.
- **`send_email_fire_and_forget()`** -- schedules the email as a background asyncio task. Safe to call from any service function without needing `BackgroundTasks`. Errors are logged but never propagate to the caller.

The notification service (`backend/app/services/notification_service.py`) uses `send_email_fire_and_forget()` internally, so creating a notification with an `email_template` parameter automatically dispatches the email.

### Customizing Templates

All templates extend `email_base.html` via `{% extends "email_base.html" %}` and override `{% block content %}`.

Common Jinja2 variables available in every template:

| Variable | Type | Description |
|---|---|---|
| `subject` | `str` | Email subject line (also set in the `<title>` tag). |
| `frontend_url` | `str` | Base URL of the frontend app (e.g., `https://app.igolo.in`). |
| `recipient_name` | `str` | Full name of the recipient. |
| `year` | `int` | Current year (for the copyright footer). |

Template-specific variables are passed through the `template_data` dict. For example, `quotation_sent.html` expects `rooms` (list of room objects), `total_amount`, `client_name`, `quote_version`, and `view_url`.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `[EMAIL] SMTP not configured, skipping email` in logs | `SMTP_USER` is empty in `.env`. | Set a valid SMTP_USER and SMTP_PASSWORD. |
| `[EMAIL] FAILED to send` with authentication error | Wrong password or missing App Password for Gmail. | Generate a new App Password at https://myaccount.google.com/apppasswords. |
| Emails land in spam | Missing SPF/DKIM/DMARC records for the sending domain. | Configure DNS records or use a transactional email service (Resend, Postmark, SES). |
| Template not found error | Template filename mismatch between the service call and the file on disk. | Verify the filename in `backend/app/templates/` matches the `template_name` argument exactly. |

---

## 2. WhatsApp Business Integration

The system integrates with the **Meta WhatsApp Business Cloud API** to send template-based notifications to clients and staff.

### Setup

1. Go to the [Meta Business Dashboard](https://business.facebook.com/) and create a WhatsApp Business account.
2. Under **WhatsApp > API Setup**, note your **Phone Number ID** and generate a permanent **Access Token**.
3. Register and get approval for each message template (see below).

### Configuration

```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
WHATSAPP_ENABLED=true
```

| Variable | Description | Default |
|---|---|---|
| `WHATSAPP_API_URL` | Meta Graph API base URL. | `https://graph.facebook.com/v18.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | The numeric ID of your WhatsApp Business phone number (not the phone number itself). | (empty) |
| `WHATSAPP_ACCESS_TOKEN` | Permanent token from Meta Business settings. | (empty) |
| `WHATSAPP_ENABLED` | Master toggle. Set to `false` to disable all WhatsApp messaging. | `false` |

When `WHATSAPP_ENABLED` is `false` or the access token is empty, all WhatsApp calls silently return `False` and log an informational skip message.

### Message Templates

These templates must be created and approved in the Meta Business Dashboard before they can be used. The `template_name` values below must match exactly.

| Template Name | Purpose | Parameters |
|---|---|---|
| `lead_assigned` | Notify a sales person about a new lead. | `{{1}}` = lead name, `{{2}}` = assigned-to name |
| `quote_sent` | Tell the client their quotation is ready to review. | `{{1}}` = client name, `{{2}}` = quote amount, `{{3}}` = view link |
| `payment_received` | Confirm a payment has been credited. | `{{1}}` = client name, `{{2}}` = amount, `{{3}}` = project name |
| `sprint_update` | Inform the client about project phase progress. | `{{1}}` = client name, `{{2}}` = sprint name, `{{3}}` = status |
| `project_handover` | Announce that the project is complete and ready for handover. | `{{1}}` = client name, `{{2}}` = project name |

### Convenience Functions

The service at `backend/app/services/whatsapp_service.py` exposes dedicated helpers:

- `notify_lead_assigned(phone, lead_name, assigned_to)`
- `notify_quote_sent(phone, client_name, quote_amount, quote_link)`
- `notify_payment_received(phone, client_name, amount, project_name)`
- `notify_sprint_update(phone, client_name, sprint_name, status)`
- `notify_project_handover(phone, client_name, project_name)`

All functions accept Indian 10-digit numbers and automatically prepend the `91` country code.

### WhatsApp Log Model

Every outbound message is tracked in the `whatsapp_logs` table:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `phone` | String(20) | Recipient phone number (normalized). |
| `template_name` | String(255) | Meta template name used. |
| `status` | String(20) | `sent`, `failed`, or `delivered`. |
| `error_message` | Text (nullable) | Error details if the send failed. |
| `created_at` | DateTime | Timestamp of the send attempt. |

### Settings Page Configuration

In the frontend admin panel under **Settings > Integrations > WhatsApp**, administrators can:

- Enter the Phone Number ID and Access Token.
- Toggle `WHATSAPP_ENABLED` on/off.
- Send a **test message** to any phone number to verify the integration.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `WhatsApp not configured, skipping message` | `WHATSAPP_ENABLED` is `false` or token is empty. | Set both values in `.env` and restart the backend. |
| 401 Unauthorized from Meta API | Expired or invalid access token. | Regenerate the token in Meta Business Dashboard. |
| Message sent but not received | Template not approved by Meta, or phone number not opted in. | Check template approval status; ensure the recipient has sent an initial message or the template is approved for the desired category. |
| Phone number format errors | Number has unexpected characters or wrong length. | The `normalize_phone()` function strips non-digits and prepends `91` for 10-digit numbers. Ensure the stored number is correct. |

---

## 3. Razorpay Payment Gateway

Razorpay handles online payments from clients (project milestone payments) and subscription billing for SaaS plans.

### Setup

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Navigate to **Settings > API Keys** and generate a Key ID + Key Secret pair.
3. For test mode, use the test keys provided by Razorpay.

### Configuration

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret
```

| Variable | Description | Default |
|---|---|---|
| `RAZORPAY_KEY_ID` | Razorpay publishable key (starts with `rzp_test_` or `rzp_live_`). | (empty) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key. Never expose this on the frontend. | (empty) |

If either value is empty, calling any payment endpoint returns a `400 Bad Request` with the message "Razorpay is not configured."

### Payment Flow (Project Milestone Payments)

```
Client Browser                    Frontend                   Backend                    Razorpay
     |                              |                          |                          |
     |  1. Select project + amount  |                          |                          |
     |----------------------------->|                          |                          |
     |                              |  2. POST /payments/      |                          |
     |                              |     create-order         |                          |
     |                              |------------------------->|                          |
     |                              |                          |  3. Create order          |
     |                              |                          |------------------------->|
     |                              |                          |  4. Order ID + amount     |
     |                              |                          |<-------------------------|
     |                              |  5. Return order_id      |                          |
     |                              |     + key_id             |                          |
     |                              |<-------------------------|                          |
     |  6. Open Razorpay Checkout   |                          |                          |
     |<-----------------------------|                          |                          |
     |                              |                          |                          |
     |  7. Customer completes       |                          |                          |
     |     payment in popup         |                          |                          |
     |----------------------------->|                          |                          |
     |                              |  8. POST /payments/      |                          |
     |                              |     verify               |                          |
     |                              |  (payment_id, order_id,  |                          |
     |                              |   signature)             |                          |
     |                              |------------------------->|                          |
     |                              |                          |  9. Verify signature      |
     |                              |                          |     (HMAC-SHA256)         |
     |                              |                          |                          |
     |                              |                          | 10. Create INFLOW         |
     |                              |                          |     transaction (CLEARED) |
     |                              |                          |     Credit project wallet |
     |                              |                          |     Notify managers       |
     |                              |                          |                          |
     |                              | 11. { success: true,     |                          |
     |                              |   transaction_id }       |                          |
     |                              |<-------------------------|                          |
     | 12. Show success screen      |                          |                          |
     |<-----------------------------|                          |                          |
```

**Step by step:**

1. **Client selects a project and enters the payment amount** in the Client Portal.
2. **Frontend calls `POST /payments/create-order`** with `{ project_id, amount }`. Allowed roles: CLIENT, MANAGER, SUPER_ADMIN.
3. **Backend creates a Razorpay order** via the SDK. The amount is converted to paise (multiply by 100). A receipt ID is generated from the project ID.
4. **Razorpay returns the order object** with `id`, `amount`, `currency`.
5. **Backend returns `{ razorpay_order_id, amount, currency, key_id }`** to the frontend. The `key_id` is the publishable key safe to expose.
6. **Frontend opens the Razorpay Checkout popup** using the returned order details.
7. **Customer completes payment** (card, UPI, netbanking, etc.) inside the Razorpay popup.
8. **On success, frontend calls `POST /payments/verify`** with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, project_id, amount }`.
9. **Backend verifies the HMAC-SHA256 signature** using the Razorpay SDK to confirm the payment is genuine.
10. **On valid signature:** a `Transaction` record is created with `category=INFLOW`, `source=CLIENT`, `status=CLEARED`. The `ProjectWallet.total_received` is incremented by the payment amount. A `PAYMENT_RECEIVED` notification is sent to all managers.
11. **Backend returns `{ success: true, transaction_id }`**.
12. **Frontend shows a success confirmation** to the client.

### Subscription Billing (SaaS Plans)

Razorpay also handles plan upgrades for multi-tenant organizations. The subscription service at `backend/app/services/subscription_service.py` supports:

| Plan | Monthly (INR) | Yearly (INR) |
|---|---|---|
| STARTER | 999 | 9,999 |
| PRO | 2,999 | 29,999 |
| ENTERPRISE | Custom pricing | Custom pricing |

The subscription flow mirrors the project payment flow: create an order, open checkout, verify, then activate the plan via `activate_subscription()` which updates the organization's `plan_tier`, `subscription_status`, `max_users`, and `max_projects`.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Razorpay is not configured" error | `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is empty. | Add valid keys to `.env`. Use test keys for development. |
| Signature verification failed | Mismatch between order/payment/signature, or wrong secret key. | Ensure `RAZORPAY_KEY_SECRET` matches the key used to create the order. In test mode, use test keys only. |
| Payment succeeds in popup but verify fails | Frontend sending wrong `razorpay_order_id` or `razorpay_payment_id`. | Log the values sent by the Razorpay callback and compare with the backend expectation. |
| Live payments failing but test works | Still using test keys in production, or live mode not activated in Razorpay Dashboard. | Switch to `rzp_live_` keys and ensure your Razorpay account is fully activated. |

---

## 4. Google Maps / Places API

The Google Places Autocomplete integration provides location suggestions when entering lead addresses.

### Configuration

In `frontend/.env`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key with the Places library enabled. | (empty -- falls back to plain text input) |

### Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Maps JavaScript API** and **Places API**.
4. Create an API key under **Credentials**.
5. Restrict the key: set **Application restrictions** to HTTP referrers and add your frontend domain(s). Set **API restrictions** to Maps JavaScript API and Places API only.

### How It Works

The `PlacesAutocomplete` component (`frontend/components/ui/places-autocomplete.tsx`) loads the Google Maps script as a singleton and initializes `google.maps.places.Autocomplete` on the input field.

Key behaviors:

- **Country restriction:** Defaults to India (`["in"]`). Configurable via the `countryRestrictions` prop.
- **Result types:** Returns both `geocode` and `establishment` results by default.
- **Extracted data:** On place selection, the component parses `address_components` to extract city, state, country, postal code, and lat/lng coordinates. This structured data is passed to the parent via the `onPlaceSelect` callback.
- **Graceful fallback:** When `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set, the component renders as a standard text input with no autocomplete. No errors are thrown.

### Where It Is Used

- **New Lead form** (`frontend/app/dashboard/sales/leads/new/page.tsx`) -- address field.
- **Lead detail/edit page** (`frontend/app/dashboard/sales/leads/[id]/page.tsx`) -- address field.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| No autocomplete suggestions appear | API key missing, invalid, or Places API not enabled. | Verify the key in Google Cloud Console; ensure Maps JavaScript API and Places API are both enabled. |
| "Failed to load Google Maps script" in console | API key restrictions blocking your domain. | Add `http://localhost:3000/*` (dev) and your production domain to allowed referrers. |
| Suggestions appear but no data extracted | `fields` parameter mismatch. | The component requests `formatted_address`, `address_components`, `geometry`, `place_id`, and `name`. Ensure billing is enabled on the Google Cloud project (Places API requires a billing account). |

---

## 5. AI Floor Plan Analysis

The ERP includes an AI-powered floor plan analyzer that extracts room layouts, dimensions, and interior item suggestions from uploaded floor plan images.

### Architecture

The floor plan analyzer runs as a **separate microservice** (`floorplan-ai/`) communicating with the main backend. It supports two AI providers:

- **Google Gemini** (recommended for production) -- fast, accurate, cloud-hosted.
- **Ollama** (for local development) -- runs locally, no API key needed, but slower and less accurate.

### Configuration

In the `floorplan-ai/.env`:

```env
# Provider selection
AI_PROVIDER=gemini          # "gemini" or "ollama"

# Gemini settings
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# Ollama settings (only needed if AI_PROVIDER=ollama)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llava:13b

# Service settings
BACKEND_URL=http://backend:8000
CORS_ORIGINS=http://localhost:3000
REQUEST_TIMEOUT=300
```

| Variable | Description | Default |
|---|---|---|
| `AI_PROVIDER` | Which AI backend to use. | `gemini` |
| `GEMINI_API_KEY` | Google AI Studio API key. Get one at https://aistudio.google.com/apikey. | (empty -- required if provider is `gemini`) |
| `GEMINI_MODEL` | Gemini model name. | `gemini-2.0-flash` |
| `OLLAMA_BASE_URL` | URL where Ollama is running. Inside Docker, use `host.docker.internal`. | `http://host.docker.internal:11434` |
| `OLLAMA_MODEL` | Ollama vision model. Must support image inputs (e.g., `llava:13b`, `bakllava`). | `llava:13b` |
| `REQUEST_TIMEOUT` | Max seconds to wait for AI response. Ollama on CPU can be very slow. | `300` (5 minutes) |

### What It Extracts

The analyzer returns a structured `FloorPlanAnalysis` object:

| Field | Type | Description |
|---|---|---|
| `property_type` | Enum | APARTMENT, VILLA, INDEPENDENT_HOUSE, PENTHOUSE, STUDIO, OFFICE, or null. |
| `bhk_config` | String | "1 BHK", "2 BHK", "3 BHK", "4 BHK", or null. |
| `total_carpet_area_sqft` | Float | Estimated total carpet area in square feet. |
| `rooms` | List | Detected rooms with name, matched catalog key, dimensions (length/breadth/height/area), and suggested interior items. |
| `suggested_scope` | List | Recommended scope of work (e.g., "Full Home Interior", "Modular Kitchen"). |
| `suggested_package` | Enum | BASIC (under 800 sqft), STANDARD (800-1200), PREMIUM (1200-2000), LUXURY (over 2000). |
| `confidence` | Float | 0.0 to 1.0 score reflecting image clarity and extraction reliability. |
| `notes` | String | AI observations, caveats, or warnings. |

Room matching uses a built-in catalog of 14 room types (Living Room, Kitchen, Master Bedroom, etc.) with predefined item suggestions for each. The post-processor filters suggested items to only include valid entries from the catalog and auto-calculates missing area values.

### How to Use

1. Open the **Quote Wizard** in the sales pipeline.
2. Click **Upload Layout Plan** and select a floor plan image (PNG, JPEG, WebP, or PDF).
3. Click **Analyze**. The system sends the image to the AI microservice.
4. Review the results: detected rooms, dimensions, BHK config, and suggested items.
5. Click **Apply** to populate the quotation rooms and items from the analysis.

### Confidence Scoring

| Score | Meaning |
|---|---|
| 0.8 -- 1.0 | High confidence. Dimensions are likely accurate. |
| 0.5 -- 0.79 | Medium confidence. Some rooms or dimensions may be estimated. Manual review recommended. |
| Below 0.5 | Low confidence. The image may be unclear, partial, or not a floor plan. |
| 0.0 | The uploaded image was not recognized as a floor plan. |

### Retry Logic

If the AI returns invalid JSON on the first attempt, the analyzer automatically retries with a stricter prompt (temperature set to 0.0, explicit instruction to return raw JSON only). If both attempts fail, a descriptive error is returned.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "GEMINI_API_KEY is not configured" | Missing API key when provider is `gemini`. | Set `GEMINI_API_KEY` in the `floorplan-ai/.env`. |
| "Ollama is not reachable" | Ollama server not running or wrong URL. | Start Ollama (`ollama serve`) and verify the model is pulled (`ollama pull llava:13b`). |
| "AI returned invalid JSON after 2 attempts" | Small model struggling with structured output. | Switch to Gemini or a larger Ollama model. |
| Timeout errors | Ollama running on CPU, model too large. | Increase `REQUEST_TIMEOUT`, use a smaller model, or switch to Gemini. |
| Rooms not matching catalog | AI returned non-standard room names. | The post-processor only keeps items matching the catalog. You can extend `ROOM_CATALOG` in `floorplan-ai/app/analyzer.py` for new room types. |

---

## 6. Sentry Error Tracking

Sentry captures unhandled exceptions and performance data from the backend.

### Configuration

```env
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

| Variable | Description | Default |
|---|---|---|
| `SENTRY_DSN` | Sentry Data Source Name. Get this from your Sentry project settings under **Client Keys (DSN)**. | (empty -- Sentry disabled) |

### Backend Setup

Sentry is initialized conditionally in `backend/app/main.py`:

```python
if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.2)
```

- **Traces sample rate** is set to `0.2` (20% of requests are traced for performance monitoring).
- When `SENTRY_DSN` is empty, the `sentry_sdk` is never imported and has zero overhead.
- All unhandled exceptions in FastAPI route handlers are automatically captured.

### Frontend Setup

Sentry is not yet integrated on the frontend. To add it:

1. Install the SDK: `npm install @sentry/nextjs`.
2. Run `npx @sentry/wizard@latest -i nextjs`.
3. Set `NEXT_PUBLIC_SENTRY_DSN` in `frontend/.env`.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| No errors appearing in Sentry | DSN is empty or incorrect. | Verify `SENTRY_DSN` is set and matches your Sentry project. |
| Too many performance traces | Sample rate too high for your plan. | Lower `traces_sample_rate` (e.g., `0.05` for 5%). |
| Sentry blocking startup | Network issue reaching Sentry's ingest endpoint. | Sentry SDK init is non-blocking by default. Check firewall/proxy rules if errors persist. |

---

## 7. Redis

Redis provides the backing store for the API rate limiter.

### Configuration

```env
REDIS_URL=redis://redis:6379/0
```

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Full Redis connection URL. In Docker Compose, `redis` is the service name. | `redis://redis:6379/0` |

### What It Powers

**Rate limiting on the login endpoint.** The `POST /auth/token` endpoint is protected by `fastapi-limiter` with a limit of **5 attempts per 60 seconds** per client IP. This prevents brute-force password attacks.

### Initialization

Redis is connected during the FastAPI application startup (lifespan handler in `backend/app/main.py`). The rate limiter is initialized via:

```python
redis_client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
await FastAPILimiter.init(redis_client)
```

### Graceful Degradation

If Redis is unavailable at startup (not running, wrong URL, network unreachable), the application logs a warning and continues without rate limiting:

```
WARNING: Redis unavailable -- rate limiting disabled: [error details]
```

This means the application is fully functional without Redis. The only consequence is that the login endpoint will not enforce request limits.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Redis unavailable -- rate limiting disabled" on startup | Redis server not running or wrong URL. | Start the Redis container (`docker compose up redis`) or verify `REDIS_URL`. |
| Rate limiter not working (unlimited login attempts) | Redis connected but `fastapi-limiter` dependency not applied to the route. | The `RateLimiter(times=5, seconds=60)` dependency is on `POST /auth/token`. Verify it is present in `backend/app/api/v1/auth/router.py`. |
| Connection refused on `redis:6379` | Running outside Docker Compose where `redis` hostname does not resolve. | Use `redis://localhost:6379/0` for local development without Docker. |

---

## 8. Notification System

The in-app notification system delivers real-time alerts to users based on their role and organization membership.

### Notification Types

| Type | Description |
|---|---|
| `ALERT` | General alerts (e.g., low stock, deadline approaching). |
| `APPROVAL_REQ` | Action required -- a PO, expense, or VO needs approval. |
| `INFO` | Informational updates (e.g., project status changed). |
| `PAYMENT_RECEIVED` | A client payment has been credited to a project wallet. |

### What Triggers Notifications

| Event | Recipients | Type | Also Sends Email |
|---|---|---|---|
| New lead created | Assigned sales person | INFO | Yes (`new_lead.html`) |
| Lead re-assigned | New assignee | INFO | Yes (`new_lead.html`) |
| Quotation sent to client | Client | INFO | Yes (`quotation_sent.html`) |
| Project converted from quote | Client + Manager | INFO | Yes (`project_started.html`) |
| Payment received (Razorpay) | All managers in org | PAYMENT_RECEIVED | Yes (`payment_confirmed.html`) |
| Manual payment entry | Manager (for approval) | APPROVAL_REQ | Yes (`transaction_pending.html`) |
| Variation Order created/updated | Client + Project manager | INFO | Yes (`variation_order.html`) |
| Material request submitted | Manager | APPROVAL_REQ | Optional |
| Expense requires approval | Manager / Super Admin | APPROVAL_REQ | Optional |
| Password reset requested | Requesting user | INFO | Yes (`password_reset.html`) |

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/notifications` | GET | List notifications for the current user. Supports `?unread_only=true`, `?skip=`, `?limit=`. |
| `/notifications/unread-count` | GET | Returns `{ count: N }` for the badge number. |
| `/notifications/{id}/read` | PATCH | Mark a single notification as read. |
| `/notifications/read-all` | PATCH | Mark all unread notifications as read. |

### Frontend Polling

The frontend polls for unread notifications every **60 seconds** using TanStack Query:

```typescript
useQuery(['notifications', 'unread-count'], fetchUnreadCount, {
  refetchInterval: 60_000,
});
```

The notification bell icon in the top navbar shows a red badge with the unread count. Clicking the bell opens a dropdown panel listing recent notifications. Each notification includes:

- **Title** and **body** text.
- **Timestamp** (relative, e.g., "5 minutes ago").
- **Action URL** -- clicking the notification navigates to the relevant page.
- **Read/unread indicator** -- unread notifications are visually highlighted.

### Service Layer

The notification service (`backend/app/services/notification_service.py`) provides:

- **`create_notification()`** -- Creates a single notification for a specific user. Optionally sends an email if `email_template` and `email_data` are provided.
- **`notify_role()`** -- Sends notifications (and optional emails) to all active users with a given role within an organization. Used for broadcasting to all managers, for example.
- **`get_notifications()`** -- Fetches paginated notifications for a user.
- **`get_unread_count()`** -- Returns the unread count for badge display.
- **`mark_as_read()`** -- Marks a single notification as read.
- **`mark_all_read()`** -- Marks all unread notifications as read for a user.

### Database Schema

The `notifications` table:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `recipient_id` | UUID (FK -> users) | The user who receives this notification. |
| `org_id` | UUID (FK -> organizations) | Tenant scope. |
| `type` | Enum | ALERT, APPROVAL_REQ, INFO, PAYMENT_RECEIVED. |
| `title` | String(255) | Short notification title. |
| `body` | Text | Full notification message. |
| `action_url` | String(500), nullable | URL to navigate to when clicked. |
| `is_read` | Boolean | Whether the user has seen this notification. Default: `false`. |
| `created_at` | DateTime | When the notification was created. |
| `updated_at` | DateTime | Last modification timestamp. |

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Badge always shows 0 | Notifications being created with wrong `org_id` or `recipient_id`. | Check that the service is passing the correct tenant context. |
| Email sent but no in-app notification | `create_notification()` not called; email sent directly via `send_email()`. | Ensure the code path uses `create_notification()` with `email_template` instead of calling `send_email()` separately. |
| Notifications not appearing for a role | `notify_role()` filtering by `OrgMembership.is_active`. | Verify the user has an active membership in the target organization. |
| Polling too frequent / too slow | Hardcoded interval in the frontend query. | Adjust the `refetchInterval` value in the notifications query hook. |
