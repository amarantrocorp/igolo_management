# Deployment & Operations

This guide covers everything needed to run Igolo Interior ERP in local development and deploy it to production on a Hostinger VPS.

---

## Local Development Setup

### Prerequisites

- Docker Desktop 4.x+ with Docker Compose v2
- Node.js 20+ (for running frontend outside Docker)
- Python 3.11+ (for running backend outside Docker)
- PostgreSQL 16 client tools (for `psql` access)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/igolo-interior.git
cd igolo-interior

# Copy environment template
cp .env.example .env
# Edit .env with your local values (DB credentials, JWT secret, etc.)

# Start all services
docker compose up -d

# Verify services are running
docker compose ps
```

### Docker Compose Services (Development)

The development `docker-compose.yml` runs five services:

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 with health checks |
| `redis` | 6379 | Redis 7 Alpine for caching and rate limiting |
| `backend` | 8000 | FastAPI with hot-reload (`--reload` flag) |
| `frontend` | 3000 | Next.js dev server with HMR |
| `floorplan-ai` | 8001 | Floor plan analysis microservice |

The backend and frontend mount local source directories as volumes so code changes are reflected immediately.

### Running Database Migrations

```bash
# Run all pending migrations
docker compose exec backend alembic upgrade head

# Create a new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "description of change"

# Rollback one migration
docker compose exec backend alembic downgrade -1
```

### Running Tests

```bash
# Backend tests
docker compose exec backend pytest -v

# Backend linting
docker compose exec backend ruff check .
docker compose exec backend black --check .

# Frontend linting and type checking
cd frontend && npm run lint
cd frontend && npm run build  # type checks during build
```

### Environment Variables

Key variables for local development (see `.env.example` for full list):

| Variable | Example | Description |
|----------|---------|-------------|
| `DB_USER` | `erp_admin` | PostgreSQL username |
| `DB_PASSWORD` | `changeme_strong_password` | PostgreSQL password |
| `DB_NAME` | `int_design_erp` | Database name |
| `SECRET_KEY` | `your-jwt-secret` | JWT signing key |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Frontend API base URL |
| `NEXT_PUBLIC_BASE_DOMAIN` | `localhost:3000` | Base domain for multi-tenant routing |
| `NEXT_PUBLIC_USE_SUBDOMAINS` | `false` | Disable subdomains locally |
| `GEMINI_API_KEY` | `your-key` | Google Gemini key for floor plan AI |

---

## Production Deployment (Hostinger VPS)

### Server Requirements

| Spec | Minimum | Recommended |
|------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 400 GB NVMe |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Network | 1 Gbps | 1 Gbps |

The production stack is sized for the recommended Hostinger KVM 8 plan (8 vCPU, 16 GB RAM, 400 GB NVMe).

### Infrastructure Directory

All production infrastructure files live under `infra/hostinger/`:

```
infra/hostinger/
  setup.sh                  # One-time server provisioning
  deploy.sh                 # Zero-downtime deployment
  backup.sh                 # Automated PostgreSQL backup
  renew-ssl.sh              # SSL certificate renewal
  docker-compose.prod.yml   # Production Docker Compose
  nginx/default.conf        # Nginx reverse proxy config
  env.template              # Production .env template
```

### Initial Server Setup

Run `setup.sh` as root on a fresh Ubuntu 22.04 server. It performs nine steps:

1. System package update and upgrade
2. Docker and Docker Compose plugin installation
3. Certbot installation for SSL certificates
4. Creation of a dedicated `igolo` system user with Docker group access
5. UFW firewall configuration (ports 22, 80, 443 only)
6. fail2ban installation for brute-force protection
7. Application directory creation under `/opt/igolo/`
8. 4 GB swap file creation
9. Kernel parameter tuning (`somaxconn`, `tcp_max_syn_backlog`, `overcommit_memory`)

```bash
# SSH into the server as root
ssh root@your-vps-ip

# Upload and run setup
scp infra/hostinger/setup.sh root@your-vps-ip:/tmp/
ssh root@your-vps-ip 'bash /tmp/setup.sh'
```

After setup completes, follow the printed instructions to clone the repo, configure `.env`, and start services.

### SSL Setup (Let's Encrypt Wildcard via Cloudflare DNS)

The system uses wildcard SSL certificates to support multi-tenant subdomains (`*.igolohomes.com`).

**Step 1: Install Cloudflare DNS plugin**

```bash
apt install -y python3-certbot-dns-cloudflare
```

**Step 2: Create Cloudflare credentials file**

```bash
mkdir -p /root/.secrets
cat > /root/.secrets/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 /root/.secrets/cloudflare.ini
```

The Cloudflare API token needs `Zone:DNS:Edit` permissions for your domain.

**Step 3: Obtain wildcard certificate**

```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d igolohomes.com \
  -d '*.igolohomes.com' \
  --preferred-challenges dns-01
```

**Step 4: Automated renewal**

The `renew-ssl.sh` script handles renewal and reloads Nginx automatically. Add it to crontab:

```bash
# Run daily at 3 AM
0 3 * * * /opt/igolo/infra/hostinger/renew-ssl.sh
```

### Zero-Downtime Deployment

The `deploy.sh` script performs five steps:

1. `git pull origin main` to fetch latest code
2. `docker compose build --parallel` to rebuild changed images
3. `docker compose up -d --remove-orphans` to restart only changed containers
4. `alembic upgrade head` to run pending database migrations
5. `docker image prune -f` to clean up unused images

```bash
# Manual deploy from the server
su - igolo
cd /opt/igolo
bash infra/hostinger/deploy.sh
```

Docker Compose recreates only containers whose images have changed, so Nginx and the database stay up during backend/frontend rebuilds.

### Backup Strategy

The `backup.sh` script runs `pg_dumpall` against the PostgreSQL container, compresses the output with gzip, and stores it in `/opt/igolo/backups/`. Backups older than 7 days are automatically deleted.

```bash
# Add to crontab: run every 6 hours
0 */6 * * * /opt/igolo/infra/hostinger/backup.sh
```

**Backup retention:**
- Local: 7 days (28 backups at 6-hour intervals)
- Remote: Optionally upload to S3 by uncommenting the `aws s3 cp` line in `backup.sh`

**Restore procedure:**

```bash
# Decompress and restore
gunzip < /opt/igolo/backups/db_20260325_060000.sql.gz | \
  docker compose -f infra/hostinger/docker-compose.prod.yml exec -T db \
  psql -U $DB_USER -d $DB_NAME
```

---

## Docker Services Configuration (Production)

The production `docker-compose.prod.yml` defines six services with resource limits:

| Service | CPU Limit | Memory Limit | Memory Reserved |
|---------|-----------|--------------|-----------------|
| `db` (PostgreSQL 16) | 1.0 | 2560 MB | 1 GB |
| `redis` (7 Alpine) | 0.1 | 192 MB | 128 MB |
| `backend` (FastAPI/Uvicorn) | 1.0 | 1536 MB | 768 MB |
| `frontend` (Next.js standalone) | 0.5 | 1 GB | 512 MB |
| `floorplan-ai` (Gemini) | 0.5 | 512 MB | 256 MB |
| `nginx` (Alpine) | 0.2 | 128 MB | 64 MB |

**PostgreSQL tuning** applied via container command flags:
- `shared_buffers=512MB`
- `effective_cache_size=1536MB`
- `work_mem=8MB`
- `maintenance_work_mem=128MB`
- `max_connections=100`
- `random_page_cost=1.1` (SSD-optimized)
- `wal_level=replica` with archive mode enabled
- Slow query logging at 1000ms threshold

**Redis tuning:**
- `maxmemory 128mb` with LRU eviction
- AOF persistence enabled
- Snapshot every 60 seconds if 1000+ writes

All services communicate over a dedicated `igolo-network` bridge network. Only Nginx exposes ports 80 and 443 to the host.

---

## Nginx Configuration

The production Nginx config (`infra/hostinger/nginx/default.conf`) handles:

**HTTP to HTTPS redirect** -- All port-80 traffic redirects to HTTPS, except ACME challenge paths for certificate renewal.

**SSL configuration:**
- TLS 1.2 and 1.3 only
- Session cache (10 MB shared, 1-day timeout)
- HSTS header with 2-year max-age and `includeSubDomains`
- `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`

**Wildcard subdomain support** -- `server_name igolohomes.com *.igolohomes.com` routes all tenant subdomains through the same Nginx instance. The backend extracts the subdomain from the `Host` header for tenant resolution.

**Proxy routing:**

| Path | Upstream | Notes |
|------|----------|-------|
| `/api/*` | `backend:8000` | CORS preflight handled at Nginx level |
| `/docs`, `/openapi.json` | `backend:8000` | Swagger/OpenAPI documentation |
| `/uploads/*` | `backend:8000` | Static file uploads with 30-day cache |
| `/ai/*` | `floorplan-ai:8001` | 5-minute timeout for AI processing |
| `/_next/static/*` | `frontend:3000` | 1-year immutable cache |
| `/*` | `frontend:3000` | Next.js pages with WebSocket upgrade for HMR |

**Compression:** gzip level 6 on text, CSS, JavaScript, JSON, XML, and SVG (minimum 256 bytes).

**Upload limit:** 50 MB maximum request body size.

---

## CI/CD with GitHub Actions

### Workflow: Build & Deploy (`deploy-hostinger.yml`)

The single workflow file handles both CI (lint + test) and CD (deploy to VPS).

**Trigger:** Push to `main` branch or manual `workflow_dispatch`.

**Job 1: `build` (CI)**

Runs on every push with a PostgreSQL 16 service container:

1. Checkout code
2. Set up Python 3.11
3. Install backend dependencies
4. Lint with `ruff check`
5. Check formatting with `black --check`
6. Run `pytest` against the test database
7. Set up Node.js 20
8. Run `npm ci`, `npm run lint`, `npm run build` for frontend

**Job 2: `deploy` (CD)**

Runs only after `build` succeeds and only on the `main` branch:

1. SSH into the VPS using `appleboy/ssh-action`
2. Install Docker if missing (first-time setup)
3. Clone repository to `/opt/igolo` if missing
4. Pull latest code from `main`
5. Create `.env` from template if missing (exits with error for manual configuration)
6. Build Docker images in parallel
7. Start services with `--remove-orphans`
8. Run Alembic migrations
9. Prune unused Docker images

### Required GitHub Secrets

Configure these in your repository settings under Settings > Secrets and variables > Actions:

| Secret | Description | Example |
|--------|-------------|---------|
| `VPS_HOST` | Hostinger VPS IP address | `203.0.113.50` |
| `VPS_USER` | SSH username (typically `root` or `igolo`) | `root` |
| `VPS_SSH_KEY` | Private SSH key (full PEM content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `GOOGLE_MAPS_KEY` | Google Maps API key for address autocomplete | `AIza...` |

The SSH key should correspond to a public key in `~/.ssh/authorized_keys` on the VPS.

---

## Database Migrations (Alembic)

### Migration Commands

```bash
# Apply all pending migrations
docker compose exec backend alembic upgrade head

# Create a new auto-generated migration
docker compose exec backend alembic revision --autogenerate -m "add_invoice_table"

# View current migration state
docker compose exec backend alembic current

# View migration history
docker compose exec backend alembic history

# Rollback one step
docker compose exec backend alembic downgrade -1

# Rollback to a specific revision
docker compose exec backend alembic downgrade abc123
```

### Migration Best Practices

- Always review auto-generated migrations before applying. Alembic may miss some changes (enum modifications, index renames).
- Test migrations against a copy of the production database before deploying.
- Never edit a migration that has already been applied to production. Create a new migration instead.
- Migrations run automatically during deployment via `deploy.sh`.

---

## Monitoring

### Error Tracking: Sentry

Sentry captures unhandled exceptions from both the backend and frontend.

**Backend integration** (FastAPI):
- The Sentry SDK initializes in `app/main.py` using the `SENTRY_DSN` environment variable.
- All unhandled 500 errors are automatically reported with request context.

**Frontend integration** (Next.js):
- Configure via `sentry.client.config.ts` and `sentry.server.config.ts`.
- Client-side errors and server-side rendering errors are captured separately.

### Uptime Monitoring: UptimeRobot

Set up the following monitors:

| Monitor | URL | Interval | Alert |
|---------|-----|----------|-------|
| Website | `https://igolohomes.com` | 5 min | Email + Slack |
| API Health | `https://igolohomes.com/api/v1/health` | 5 min | Email + Slack |
| SSL Expiry | `https://igolohomes.com` | Daily | 14 days before expiry |

### Log Access

```bash
# View all service logs
docker compose -f infra/hostinger/docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f infra/hostinger/docker-compose.prod.yml logs -f backend

# View last 100 lines
docker compose -f infra/hostinger/docker-compose.prod.yml logs --tail 100 backend

# Check PostgreSQL slow queries (logged at >1s)
docker compose -f infra/hostinger/docker-compose.prod.yml logs db | grep duration
```

---

## Scaling Path

### Phase 1: Single VPS (Current)

All services on one Hostinger KVM 8 server. Suitable for up to approximately 50 concurrent users and 100 organizations.

**Bottleneck indicators:**
- CPU consistently above 80%
- Memory usage above 90%
- Database query times increasing
- API response times above 500ms P95

### Phase 2: Multi-VPS Split

Separate database onto its own VPS for better resource isolation.

```
VPS 1 (App Server):     Nginx + Backend + Frontend + Redis
VPS 2 (Database Server): PostgreSQL 16 (dedicated)
```

- Move to Hostinger managed database or a second VPS
- Enable PostgreSQL streaming replication for read replicas
- Add Redis Sentinel for high availability

### Phase 3: Container Orchestration (AWS EKS)

For enterprise scale (500+ organizations, high availability requirements):

- Migrate to AWS EKS (Kubernetes) or ECS
- Use RDS for managed PostgreSQL with Multi-AZ
- Use ElastiCache for managed Redis
- S3 for file uploads (replacing local volume)
- CloudFront CDN for static assets
- Application Load Balancer with auto-scaling groups
- Separate backend workers for background tasks (Celery/ARQ)

---

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check container logs
docker compose -f infra/hostinger/docker-compose.prod.yml logs backend

# Check if port is in use
ss -tlnp | grep 8000
```

**Database connection refused:**
```bash
# Verify database is healthy
docker compose -f infra/hostinger/docker-compose.prod.yml exec db pg_isready -U $DB_USER

# Check if the db container is running
docker compose -f infra/hostinger/docker-compose.prod.yml ps db
```

**SSL certificate issues:**
```bash
# Check certificate expiry
openssl s_client -connect igolohomes.com:443 2>/dev/null | openssl x509 -noout -dates

# Force renewal
certbot renew --force-renewal
docker compose -f infra/hostinger/docker-compose.prod.yml exec nginx nginx -s reload
```

**Disk space running low:**
```bash
# Check Docker disk usage
docker system df

# Clean up everything unused
docker system prune -a --volumes

# Check backup directory size
du -sh /opt/igolo/backups/
```
