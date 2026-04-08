# IntDesignERP - Interior Design ERP System

A full-lifecycle ERP for interior design companies: **Lead -> Quotation -> Conversion -> Execution -> Handover**.

Built with FastAPI, Next.js 14, PostgreSQL, and React Native (Expo).

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [Node.js](https://nodejs.org/) v20+ (only needed for mobile development)
- [Git](https://git-scm.com/)

---

## Quick Start (Docker - Recommended)

### 1. Clone the repository

```bash
git clone <repo-url> int-design-erp
cd int-design-erp
```

### 2. Set up environment variables

```bash
# Root .env (backend + database + services)
cp .env.example .env

# Frontend .env
cp frontend/.env.example frontend/.env.local
```

Edit `.env` and update at minimum:
- `DB_PASSWORD` - choose a strong password
- `SECRET_KEY` - generate with `openssl rand -hex 32`
- SMTP credentials (if you need email)
- AWS/S3 credentials (if you need file uploads)

### 3. Start all services

```bash
docker compose up --build
```

This starts:

| Service        | URL                          | Description              |
|----------------|------------------------------|--------------------------|
| **Frontend**   | http://localhost:3000         | Next.js web app          |
| **Backend**    | http://localhost:8000         | FastAPI server           |
| **API Docs**   | http://localhost:8000/docs    | Swagger UI               |
| **Floorplan AI** | http://localhost:8001       | AI floor plan analysis   |
| **PostgreSQL** | localhost:5432               | Database                 |
| **Redis**      | localhost:6379               | Cache / rate limiting    |

### 4. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Seed the database

```bash
# Create the super admin user
docker compose exec backend python -m app.initial_data

# (Optional) Load sample data for development
docker compose exec backend python -m app.seed_data
```

### 6. Log in

Open http://localhost:3000 and sign in:

- **Email:** `admin@intdesignerp.com`
- **Password:** `Admin@123456`

---

## Running Without Docker

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (point DB_HOST to localhost instead of 'db')
export DATABASE_URL="postgresql+asyncpg://erp_admin:yourpassword@localhost:5432/int_design_erp"

# Run migrations
alembic upgrade head

# Seed admin user
python -m app.initial_data

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> Requires PostgreSQL and Redis running locally.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create local env
cp .env.example .env.local

# Start dev server
npm run dev
```

Opens at http://localhost:3000.

### Floorplan AI Service (Optional)

```bash
cd floorplan-ai

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## Mobile App (Expo / React Native)

```bash
cd mobile

# Install dependencies
npm install

# Create local env pointing to your backend
cp .env.development .env.local
# Edit .env.local: set API_URL=http://<your-ip>:8000/api/v1

# Start Expo
npm start
```

Then press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with Expo Go.

---

## Project Structure

```
/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/v1/       # Route controllers
│   │   ├── core/         # Config, security, exceptions
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── templates/    # Jinja2 PDF templates
│   └── alembic/          # Database migrations
├── frontend/             # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (auth)/       # Login, forgot password
│   │   └── (dashboard)/  # Protected pages
│   ├── components/       # UI components (shadcn/ui)
│   ├── lib/              # API client, utilities
│   └── store/            # Zustand stores
├── floorplan-ai/         # AI floor plan analysis service
├── mobile/               # React Native (Expo) app
├── infra/                # Infrastructure scripts
├── docker-compose.yml    # Development orchestration
└── docker-compose.prod.yml  # Production orchestration
```

---

## Common Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run backend tests
docker compose exec backend pytest

# Create a new database migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker compose exec backend alembic upgrade head

# Reset seed data
docker compose exec backend python -m app.seed_data --reset

# Rebuild a single service
docker compose up --build backend

# Stop everything
docker compose down

# Stop and remove volumes (wipes database)
docker compose down -v
```

---

## Environment Variables Reference

### Root `.env` (Backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `erp_admin` |
| `DB_PASSWORD` | PostgreSQL password | - |
| `DB_HOST` | Database host | `db` (Docker) / `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `int_design_erp` |
| `SECRET_KEY` | JWT signing key | - |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL | `30` |
| `SMTP_HOST` | Email server | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `S3_BUCKET_NAME` | S3 bucket for uploads | - |
| `REDIS_URL` | Redis connection string | `redis://redis:6379/0` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `SENTRY_DSN` | Sentry error tracking | _(optional)_ |

### `frontend/.env.local`

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key | _(optional)_ |
| `NEXT_PUBLIC_FLOORPLAN_AI_URL` | AI service URL | `http://localhost:8001` |
| `NEXT_PUBLIC_BASE_DOMAIN` | Base domain | `localhost` |
| `NEXT_PUBLIC_USE_SUBDOMAINS` | Multi-tenant subdomains | `false` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), Pydantic v2 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| Mobile | React Native, Expo, Nativewind |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access + refresh tokens), RBAC |
| PDF Generation | WeasyPrint + Jinja2 |
| File Storage | AWS S3 |
| AI | Google Gemini / Ollama (floor plan analysis) |

---

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Full system access |
| Manager | Project oversight, approvals, financials |
| BDE | Lead generation, initial contact |
| Sales | Quotations, client communication |
| Supervisor | On-site execution, labor attendance |
| Client | View project status, make payments |

---

## Troubleshooting

**Backend won't start?**
- Check PostgreSQL is running: `docker compose ps db`
- Verify `.env` has correct `DATABASE_URL`
- Run migrations: `docker compose exec backend alembic upgrade head`

**Frontend can't reach API?**
- Ensure `NEXT_PUBLIC_API_URL` matches your backend URL
- Check CORS_ORIGINS in `.env` includes your frontend URL

**WeasyPrint errors on macOS (non-Docker)?**
- Install system deps: `brew install pango gdk-pixbuf libffi`

**Redis connection refused?**
- The app degrades gracefully without Redis (rate limiting disabled)
- To fix: ensure Redis is running on port 6379
