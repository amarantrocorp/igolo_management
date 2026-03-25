# Getting Started

## System Overview

Igolo Interior ERP is a multi-tenant enterprise resource planning system purpose-built for interior design companies. It manages the complete project lifecycle from initial lead capture through to final handover:

```
Lead --> Quotation --> Conversion --> Execution --> Handover
```

The system provides role-based dashboards for sales teams, project managers, supervisors, and clients. Key capabilities include:

- **CRM and Sales Pipeline** -- Lead tracking, qualification, and quotation generation with room-by-room item breakdowns
- **Project Execution** -- Sprint-based project management following a standardized 6-phase interior design workflow
- **Financial Management** -- Per-project wallet system with spending locks, transaction verification, and profitability tracking
- **Inventory and Procurement** -- General stock and project-specific material management with purchase orders
- **Labor Management** -- Attendance tracking, daily wage and contract-based payroll, team performance analytics
- **Client Portal** -- Read-only project status, sprint progress, and online payment integration
- **Floor Plan AI** -- AI-powered floor plan analysis that extracts room information from uploaded images
- **Document Generation** -- PDF quotations, purchase orders, invoices, and work orders

---

## System Architecture

```
                            +------------------+
                            |     Nginx        |
                            | (Reverse Proxy)  |
                            +--------+---------+
                                     |
                    +----------------+----------------+
                    |                                 |
           +--------v---------+            +----------v----------+
           |   Next.js 14     |            |     FastAPI          |
           |   Frontend       |            |     Backend          |
           |   (Port 3000)    |            |     (Port 8000)      |
           +------------------+            +----------+-----------+
                                                      |
                              +-----------+-----------+-----------+
                              |           |                       |
                    +---------v--+  +-----v------+   +-----------v-----------+
                    | PostgreSQL |  |   Redis     |   |   Floor Plan AI       |
                    |   16       |  |   7-alpine  |   |   Microservice        |
                    | (Port 5432)|  | (Port 6379) |   |   (Port 8001)         |
                    +------------+  +-------------+   |   Gemini / Ollama     |
                                                      +-----------------------+
                              |
                    +---------v-----------+
                    |  File Storage       |
                    |  Local (dev)        |
                    |  AWS S3 (prod)      |
                    +---------------------+
```

External integrations:

- **Razorpay** -- Client payment gateway
- **WhatsApp Business API (Meta Cloud)** -- Template-based notifications
- **SMTP (Gmail)** -- Email notifications with Jinja2 templates
- **Google Gemini / Ollama** -- AI vision models for floor plan analysis
- **Sentry** -- Error tracking and monitoring
- **AWS S3** -- Production file storage

---

## Tech Stack Summary

| Layer | Technology | Version / Details |
|---|---|---|
| **Frontend** | Next.js (App Router) | 14+ with TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui | Radix UI based components |
| **State Management** | Zustand (client) + TanStack Query (server) | |
| **Forms** | React Hook Form + Zod | Schema-validated forms |
| **Backend** | FastAPI (async) | Python 3.11+ |
| **Database** | PostgreSQL | 16 (schema-per-tenant multi-tenancy) |
| **ORM** | SQLAlchemy (async) | Async sessions with asyncpg |
| **Migrations** | Alembic | |
| **Cache / Rate Limiting** | Redis | 7-alpine, fastapi-limiter |
| **Auth** | OAuth2 + JWT | Access + Refresh tokens (python-jose) |
| **Validation** | Pydantic v2 | Request/Response schemas |
| **PDF Generation** | WeasyPrint + Jinja2 | HTML/CSS to PDF pipeline |
| **Payments** | Razorpay | |
| **Messaging** | WhatsApp Business Cloud API (Meta) | |
| **AI** | Google Gemini / Ollama | Floor plan analysis |
| **Containerization** | Docker + Docker Compose | |
| **Reverse Proxy** | Nginx | Production SSL termination |

---

## Prerequisites

Before running the project, ensure the following are installed:

| Tool | Minimum Version | Purpose |
|---|---|---|
| **Docker** | 24+ | Container runtime |
| **Docker Compose** | v2+ | Service orchestration |
| **Node.js** | 20 LTS | Frontend development (if running outside Docker) |
| **Python** | 3.11+ | Backend development (if running outside Docker) |
| **Git** | 2.40+ | Version control |

Optional (for AI features):

- **Google Gemini API Key** -- For cloud-based floor plan analysis
- **Ollama** -- For local/self-hosted AI floor plan analysis (must have a vision model like `llava:13b` pulled)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url> igolo-interior
cd igolo-interior
```

### 2. Configure Environment Variables

Copy the example environment file and update values:

```bash
cp .env.example .env
```

At minimum, set these values in `.env`:

```env
# Database
DB_USER=erp_admin
DB_PASSWORD=changeme_strong_password
DB_NAME=int_design_erp

# JWT Secret (generate a random 64-char string for production)
SECRET_KEY=changeme_generate_a_real_secret_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Environment
ENVIRONMENT=local
```

### 3. Start All Services

```bash
docker compose up --build
```

This starts all five services. Wait for the health checks to pass (the backend depends on PostgreSQL being ready).

### 4. Run Database Migrations

In a separate terminal:

```bash
docker compose exec backend alembic upgrade head
```

### 5. Seed the Initial Admin User

```bash
docker compose exec backend python -m app.initial_data
```

### 6. Access the Application

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Docs (ReDoc)** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |
| **Floor Plan AI Health** | http://localhost:8001/health |

---

## First Login

After seeding the initial data, log in with the default Super Admin credentials:

| Field | Value |
|---|---|
| **Email** | `admin@intdesignerp.com` |
| **Password** | `Admin@123456` |

**Important:** Change this password immediately in production environments.

The Super Admin can then:
1. Create an Organization (workspace)
2. Invite team members with specific roles (Manager, BDE, Sales, Supervisor)
3. Begin configuring inventory, vendors, and project templates

---

## Environment Variables Reference

### Application

| Variable | Default | Description |
|---|---|---|
| `PROJECT_NAME` | `IntDesignERP` | Application name displayed in UI and API docs |
| `API_V1_PREFIX` | `/api/v1` | API route prefix for versioning |
| `DEBUG` | `false` | Enable SQLAlchemy query echoing and debug mode |
| `ENVIRONMENT` | `development` | `local` enables local file serving and uploads; `production` uses S3 |

### Database

| Variable | Default | Description |
|---|---|---|
| `DB_USER` | `erp_admin` | PostgreSQL username |
| `DB_PASSWORD` | `changeme_strong_password` | PostgreSQL password |
| `DB_HOST` | `db` | Database hostname (Docker service name) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `int_design_erp` | Database name |

### Authentication

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `changeme_generate_a_real_secret_key` | JWT signing secret (must be random and secure in production) |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token TTL in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL in days |

### CORS and Multi-Tenancy

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins. Supports wildcard subdomains (e.g., `https://*.igolohomes.com`) |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend base URL (used in email links and redirects) |
| `BASE_DOMAIN` | `localhost` | Base domain for multi-tenant subdomain routing |
| `USE_SUBDOMAINS` | `false` | Enable subdomain-based tenant resolution in production |

### Redis

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection URL for rate limiting and caching |

### Email (SMTP)

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | (empty) | SMTP username / email address |
| `SMTP_PASSWORD` | (empty) | SMTP password or app-specific password |
| `EMAILS_FROM_NAME` | `IntDesignERP` | Display name in outgoing emails |

### File Uploads and S3

| Variable | Default | Description |
|---|---|---|
| `UPLOAD_DIR` | `uploads` | Local upload directory (used when `ENVIRONMENT=local`) |
| `UPLOAD_MAX_IMAGE_SIZE` | `10485760` | Max image upload size in bytes (10 MB) |
| `UPLOAD_MAX_DOC_SIZE` | `26214400` | Max document upload size in bytes (25 MB) |
| `S3_BUCKET_NAME` | `int-design-erp` | AWS S3 bucket name |
| `S3_REGION` | `ap-south-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | (empty) | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | (empty) | AWS secret key |

### Razorpay (Payments)

| Variable | Default | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | (empty) | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | (empty) | Razorpay API key secret |

### WhatsApp Business API

| Variable | Default | Description |
|---|---|---|
| `WHATSAPP_ENABLED` | `false` | Enable/disable WhatsApp notifications |
| `WHATSAPP_API_URL` | `https://graph.facebook.com/v18.0` | Meta Graph API base URL |
| `WHATSAPP_PHONE_NUMBER_ID` | (empty) | WhatsApp Business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | (empty) | Meta Cloud API access token |

### Floor Plan AI Microservice

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `gemini` | AI provider: `gemini` or `ollama` |
| `GEMINI_API_KEY` | (empty) | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model name |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llava:13b` | Ollama vision model name |

### Monitoring

| Variable | Default | Description |
|---|---|---|
| `SENTRY_DSN` | (empty) | Sentry DSN for error tracking (optional) |

---

## Docker Services

The `docker-compose.yml` defines these services for local development:

### `db` -- PostgreSQL 16

- Persistent data via named volume `postgres_data`
- Health check ensures database is ready before backend starts
- Exposed on port 5432

### `redis` -- Redis 7 Alpine

- Used for API rate limiting via `fastapi-limiter`
- Graceful degradation: if Redis is unavailable, rate limiting is disabled
- Exposed on port 6379

### `backend` -- FastAPI Application

- Built from `./backend/Dockerfile`
- Runs with `--reload` for hot reloading during development
- Source code mounted as volume for live editing
- Depends on `db` (healthy) and `redis` (started)
- Exposed on port 8000

### `floorplan-ai` -- Floor Plan AI Microservice

- Built from `./floorplan-ai/Dockerfile`
- Standalone FastAPI service for AI-powered floor plan analysis
- Supports Google Gemini (cloud) and Ollama (local) as AI providers
- Exposed on port 8001

### `frontend` -- Next.js Application

- Uses `node:20-alpine` image with mounted source
- Runs `npm install && npm run dev` on startup
- Depends on backend service
- Exposed on port 3000

### Production (`docker-compose.prod.yml`)

The production compose file adds:

- **Nginx** reverse proxy with SSL termination via Certbot/Let's Encrypt
- No source volumes (images are built with code baked in)
- No `--reload` flag on backend (production Uvicorn)
- Frontend built in standalone mode

---

## Folder Structure

```
igolo-interior/
|-- backend/                     # FastAPI Application
|   |-- alembic/                 # Database migrations
|   |-- app/
|   |   |-- api/v1/              # Route controllers (versioned)
|   |   |   |-- auth/            # Authentication endpoints
|   |   |   |-- crm/             # Leads, clients
|   |   |   |-- quotes/          # Quotation CRUD and PDF
|   |   |   |-- projects/        # Project execution, sprints
|   |   |   |-- finance/         # Transactions, wallets
|   |   |   |-- inventory/       # Items, POs, stock
|   |   |   |-- labor/           # Attendance, payroll
|   |   |   |-- invoices/        # Invoice generation
|   |   |   |-- approvals/       # Approval workflows
|   |   |   |-- work_orders/     # Work order management
|   |   |   |-- material_requests/  # Supervisor indent requests
|   |   |   |-- quality/         # Checklists and inspections
|   |   |   |-- notifications/   # In-app notifications
|   |   |   |-- upload/          # File upload endpoint
|   |   |   |-- users/           # User management
|   |   |   |-- org/             # Organization management
|   |   |   |-- platform/        # Platform admin endpoints
|   |   |   |-- billing/         # Subscription billing
|   |   |   |-- payments/        # Payment processing
|   |   |   |-- assets/          # Asset tracking
|   |   |   |-- vendor_bills/    # Vendor bill reconciliation
|   |   |   +-- router.py        # Central router aggregation
|   |   |-- core/                # Config, security, middleware
|   |   |   |-- config.py        # Pydantic settings
|   |   |   |-- security.py      # JWT, RBAC, auth context
|   |   |   |-- tenant_middleware.py   # Multi-tenant schema resolution
|   |   |   |-- trial_middleware.py    # Subscription enforcement
|   |   |   |-- email.py         # SMTP email sending
|   |   |   +-- exceptions.py    # Custom HTTP exceptions
|   |   |-- db/                  # Database engine and base models
|   |   |-- models/              # SQLAlchemy ORM models
|   |   |-- schemas/             # Pydantic request/response schemas
|   |   |-- services/            # Business logic layer
|   |   |-- templates/           # Jinja2 HTML templates (PDF, email)
|   |   |-- initial_data.py      # Admin seed script
|   |   +-- main.py              # FastAPI app entry point
|   |-- requirements.txt
|   +-- Dockerfile
|
|-- frontend/                    # Next.js Application
|   |-- app/
|   |   |-- (auth)/              # Public routes (login, register)
|   |   |-- (client-portal)/     # Client-facing portal
|   |   |-- (public)/            # Public pages
|   |   +-- dashboard/           # Protected admin/staff dashboard
|   |-- components/              # Reusable UI components
|   |-- lib/                     # API client, utilities
|   |-- store/                   # Zustand state stores
|   |-- types/                   # TypeScript interfaces
|   +-- middleware.ts             # Next.js middleware (auth, routing)
|
|-- floorplan-ai/                # AI Microservice
|   |-- app/
|   |   |-- analyzer.py          # AI vision model integration
|   |   |-- config.py            # Microservice settings
|   |   |-- router.py            # API endpoints
|   |   |-- schemas.py           # Pydantic models
|   |   +-- main.py              # FastAPI entry point
|   |-- requirements.txt
|   +-- Dockerfile
|
|-- nginx/
|   +-- conf.d/
|       +-- default.conf         # Nginx reverse proxy config
|
|-- infra/                       # Infrastructure configs
|-- docker-compose.yml           # Development orchestration
|-- docker-compose.prod.yml      # Production orchestration
+-- CLAUDE.md                    # AI assistant project instructions
```

---

## Development vs Production

| Aspect | Development | Production |
|---|---|---|
| **Compose File** | `docker-compose.yml` | `docker-compose.prod.yml` |
| **Backend** | `uvicorn --reload` (hot reload) | `uvicorn` (no reload) |
| **Frontend** | `npm run dev` (HMR) | `npm run build && npm start` (standalone) |
| **Source Mounting** | Volumes mount local code | Code baked into Docker images |
| **File Storage** | Local filesystem (`uploads/` dir) | AWS S3 |
| **File Serving** | FastAPI StaticFiles mount at `/uploads` | S3 URLs / CDN |
| **Database** | Docker with exposed port 5432 | Managed DB or Docker with no exposed port |
| **Redis** | Docker with exposed port 6379 | Managed Redis or Docker with no exposed port |
| **SSL** | None (HTTP only) | Nginx + Certbot (HTTPS) |
| **CORS** | `http://localhost:3000` | Wildcard subdomain (e.g., `https://*.igolohomes.com`) |
| **Subdomains** | Disabled (`USE_SUBDOMAINS=false`) | Enabled for tenant routing |
| **Rate Limiting** | Optional (Redis) | Required (Redis-backed) |
| **Error Tracking** | Console logging | Sentry SDK |
| **Debug Mode** | Enabled | Disabled |

### Running in Development Without Docker

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Requires a local PostgreSQL instance and optionally Redis.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Floor Plan AI:**

```bash
cd floorplan-ai
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
