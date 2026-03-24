#!/bin/bash
# =============================================================================
# Igolo Interior - Automated Backup Script
# Backs up PostgreSQL database to local storage
# Add to crontab: 0 */6 * * * /opt/igolo/infra/hostinger/backup.sh
# =============================================================================
set -e

BACKUP_DIR=/opt/igolo/backups
COMPOSE_FILE=/opt/igolo/infra/hostinger/docker-compose.prod.yml
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

echo "[$(date)] Starting database backup..."

# Dump all databases
docker compose -f ${COMPOSE_FILE} exec -T db pg_dumpall -U igolo_prod | gzip > ${BACKUP_FILE}

echo "[$(date)] Backup saved to ${BACKUP_FILE} ($(du -h ${BACKUP_FILE} | cut -f1))"

# Keep last 7 days of backups
echo "[$(date)] Cleaning old backups..."
find ${BACKUP_DIR} -name "db_*.sql.gz" -mtime +7 -delete

# Optional: upload to S3 (uncomment and configure AWS CLI)
# aws s3 cp ${BACKUP_FILE} s3://igolo-backups/

echo "[$(date)] Backup complete."
