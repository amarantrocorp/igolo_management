#!/usr/bin/env bash
# Creates the S3 bucket for Terraform remote state and a DynamoDB table
# for state locking. Run this ONCE before any 'terraform init'.
#
# Prerequisites: AWS CLI configured with admin-level credentials.
# NOTE: Make this file executable with: chmod +x infra/scripts/bootstrap-terraform.sh

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

# ── Configuration ───────────────────────────────────────────────────
BUCKET_NAME="igolo-terraform-state"
DYNAMO_TABLE="igolo-terraform-locks"
REGION="${AWS_REGION:-ap-south-1}"

# ── Step 1: Create S3 bucket ───────────────────────────────────────
info "Creating S3 bucket: $BUCKET_NAME in $REGION ..."

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  warn "Bucket $BUCKET_NAME already exists. Skipping creation."
else
  # LocationConstraint is required for all regions except us-east-1
  if [[ "$REGION" == "us-east-1" ]]; then
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$REGION"
  else
    aws s3api create-bucket \
      --bucket "$BUCKET_NAME" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  info "Bucket created."
fi

# Enable versioning
info "Enabling versioning on $BUCKET_NAME ..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

# Enable server-side encryption (AES-256)
info "Enabling default encryption (AES-256) ..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

# Block public access
info "Blocking all public access ..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# ── Step 2: Create DynamoDB table for state locking ─────────────────
info "Creating DynamoDB table: $DYNAMO_TABLE in $REGION ..."

if aws dynamodb describe-table --table-name "$DYNAMO_TABLE" --region "$REGION" >/dev/null 2>&1; then
  warn "Table $DYNAMO_TABLE already exists. Skipping creation."
else
  aws dynamodb create-table \
    --table-name "$DYNAMO_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

  info "Waiting for table to become active ..."
  aws dynamodb wait table-exists --table-name "$DYNAMO_TABLE" --region "$REGION"
  info "Table created and active."
fi

# ── Done ────────────────────────────────────────────────────────────
echo ""
info "Terraform backend bootstrap complete."
info "Add this to your Terraform configuration:"
echo ""
echo "  terraform {"
echo "    backend \"s3\" {"
echo "      bucket         = \"$BUCKET_NAME\""
echo "      key            = \"<env>/terraform.tfstate\""
echo "      region         = \"$REGION\""
echo "      dynamodb_table = \"$DYNAMO_TABLE\""
echo "      encrypt        = true"
echo "    }"
echo "  }"
