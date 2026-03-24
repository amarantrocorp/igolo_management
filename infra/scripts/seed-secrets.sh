#!/usr/bin/env bash
# Usage: ./seed-secrets.sh <environment>
# Example: ./seed-secrets.sh dev
#          ./seed-secrets.sh prod
#
# Prompts for secret values interactively and stores them in
# AWS Secrets Manager under igolo/<env>/database and igolo/<env>/app.
# NOTE: Make this file executable with: chmod +x infra/scripts/seed-secrets.sh

set -euo pipefail

# ── Colour helpers ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()   { error "$@"; exit 1; }

# ── Input validation ────────────────────────────────────────────────
ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  die "Usage: $0 <environment>  (dev | prod)"
fi

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  die "Environment must be 'dev' or 'prod'. Got: $ENV"
fi

REGION="${AWS_REGION:-ap-south-1}"

# ── Helper to read a secret value from stdin ────────────────────────
read_secret() {
  local prompt="$1"
  local value=""
  # -s hides input, -r prevents backslash interpretation
  read -rsp "$prompt: " value
  echo ""  # newline after hidden input
  if [[ -z "$value" ]]; then
    die "Value cannot be empty."
  fi
  echo "$value"
}

read_value() {
  local prompt="$1"
  local value=""
  read -rp "$prompt: " value
  if [[ -z "$value" ]]; then
    die "Value cannot be empty."
  fi
  echo "$value"
}

# ── Helper to create or update a secret ─────────────────────────────
upsert_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$REGION" >/dev/null 2>&1; then
    info "Updating existing secret: $secret_name"
    aws secretsmanager put-secret-value \
      --secret-id "$secret_name" \
      --secret-string "$secret_value" \
      --region "$REGION"
  else
    info "Creating new secret: $secret_name"
    aws secretsmanager create-secret \
      --name "$secret_name" \
      --secret-string "$secret_value" \
      --region "$REGION"
  fi
}

# ── Collect secrets ─────────────────────────────────────────────────
echo ""
info "Seeding secrets for environment: $ENV"
echo "==================================================="
echo ""

echo "-- Database Secrets (igolo/$ENV/database) --"
DB_PASSWORD=$(read_secret "DB_PASSWORD")

echo ""
echo "-- Application Secrets (igolo/$ENV/app) --"
SECRET_KEY=$(read_secret "SECRET_KEY (JWT signing key)")
SMTP_PASSWORD=$(read_secret "SMTP_PASSWORD")

GEMINI_API_KEY=""
if [[ "$ENV" == "prod" ]]; then
  GEMINI_API_KEY=$(read_secret "GEMINI_API_KEY (production only)")
fi

# ── Store database secrets ──────────────────────────────────────────
echo ""
DB_SECRET_NAME="igolo/$ENV/database"
DB_SECRET_JSON=$(cat <<EOF
{
  "DB_PASSWORD": "$DB_PASSWORD"
}
EOF
)

upsert_secret "$DB_SECRET_NAME" "$DB_SECRET_JSON"

# ── Store application secrets ───────────────────────────────────────
APP_SECRET_NAME="igolo/$ENV/app"

if [[ "$ENV" == "prod" ]]; then
  APP_SECRET_JSON=$(cat <<EOF
{
  "SECRET_KEY": "$SECRET_KEY",
  "SMTP_PASSWORD": "$SMTP_PASSWORD",
  "GEMINI_API_KEY": "$GEMINI_API_KEY"
}
EOF
)
else
  APP_SECRET_JSON=$(cat <<EOF
{
  "SECRET_KEY": "$SECRET_KEY",
  "SMTP_PASSWORD": "$SMTP_PASSWORD"
}
EOF
)
fi

upsert_secret "$APP_SECRET_NAME" "$APP_SECRET_JSON"

# ── Done ────────────────────────────────────────────────────────────
echo ""
info "Secrets seeded successfully for environment: $ENV"
info "Stored at:"
info "  - $DB_SECRET_NAME"
info "  - $APP_SECRET_NAME"
echo ""
warn "Remember to configure your K8s ExternalSecrets or CSI driver to sync these."
