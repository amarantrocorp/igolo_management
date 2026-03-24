#!/bin/bash
# =============================================================================
# Igolo Interior - Zero-downtime Deploy Script
# Run from /opt/igolo as the igolo user
# =============================================================================
set -e

COMPOSE_FILE="infra/hostinger/docker-compose.prod.yml"

echo "=== Deploying Igolo Interior ==="
echo "Timestamp: $(date)"

# Pull latest code
echo "[1/5] Pulling latest code..."
git pull origin main

# Build images in parallel
echo "[2/5] Building Docker images..."
docker compose -f ${COMPOSE_FILE} build --parallel

# Bring up services (recreates only changed containers)
echo "[3/5] Starting services..."
docker compose -f ${COMPOSE_FILE} up -d --remove-orphans

# Run database migrations
echo "[4/5] Running database migrations..."
docker compose -f ${COMPOSE_FILE} exec -T backend alembic upgrade head

# Cleanup old images
echo "[5/5] Cleaning up..."
docker image prune -f

echo ""
echo "=== Deploy complete! ==="
echo "Timestamp: $(date)"
