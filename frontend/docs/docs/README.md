# Igolo Interior ERP Documentation

Welcome to the Igolo Interior ERP documentation. This guide covers everything from initial setup to advanced platform administration for the multi-tenant interior design ERP system.

Igolo Interior ERP manages the complete project lifecycle: **Lead > Quotation > Conversion > Execution > Handover**, with role-based dashboards for sales teams, project managers, supervisors, and clients.

---

## Table of Contents

### Getting Started

| # | Document | Description |
|---|----------|-------------|
| 01 | [Getting Started](./01-getting-started.md) | System overview, architecture, tech stack, and local development setup |

### Core Modules

| # | Document | Description |
|---|----------|-------------|
| 03 | [Roles & Permissions](./03-roles-permissions.md) | RBAC system, user roles (Super Admin, Manager, BDE, Sales, Supervisor, Client), and permission matrix |
| 04 | [Lead Management](./04-lead-management.md) | CRM pipeline, lead tracking, qualification, activities, and conversion to clients |
| 05 | [Quotation & Design](./05-quotation-design.md) | Quotation builder, room-by-room pricing, versioning, PDF generation, and floor plan AI |
| 06 | [Project Execution](./06-project-execution.md) | Sprint-based project management, timeline visualization, daily logs, and variation orders |
| 07 | [Financial Management](./07-financial-management.md) | Project wallet, transaction ledger, spending locks, profitability dashboard, and payment integration |
| 08 | [Inventory & Procurement](./08-inventory-procurement.md) | Item management, vendor management, purchase orders, stock transactions, and material requests |
| 09 | [Integrations](./09-integrations.md) | Razorpay payments, WhatsApp notifications, Google Maps, Gemini AI floor plan analysis, email system |
| 10 | [Platform Admin](./10-platform-admin.md) | Multi-tenant management, organization lifecycle, subscription billing, and platform analytics |

### Operations

| # | Document | Description |
|---|----------|-------------|
| 11 | [Deployment & Operations](./11-deployment.md) | Local setup, Hostinger VPS deployment, CI/CD, Docker, Nginx, SSL, backups, monitoring, and scaling |
| 12 | [API Reference](./12-api-reference.md) | Complete REST API documentation for all endpoints with request/response examples |

---

## Quick Links

- **New to Igolo?** Start with the [Getting Started](./01-getting-started.md) guide
- **Setting up for development?** See [Deployment - Local Development Setup](./11-deployment.md#local-development-setup)
- **Need the API docs?** Jump to the [API Reference](./12-api-reference.md)
- **Deploying to production?** Follow the [Deployment Guide](./11-deployment.md#production-deployment-hostinger-vps)
- **Managing users and roles?** Read [Roles & Permissions](./03-roles-permissions.md)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), Alembic, Pydantic v2 |
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand |
| Database | PostgreSQL 16, Redis 7 |
| Infrastructure | Docker, Nginx, Hostinger VPS, GitHub Actions |
| Integrations | Razorpay, Google Gemini AI, Google Maps, WhatsApp Business API |

---

## Contributing

1. Create a feature branch from `main`
2. Make your changes and ensure tests pass (`pytest -v` for backend, `npm run lint && npm run build` for frontend)
3. Push to the branch and open a pull request
4. CI will run linting, formatting checks, and tests automatically
5. Merge after approval

---

## Support

For questions or issues, contact the development team or open an issue in the repository.
