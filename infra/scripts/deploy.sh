#!/usr/bin/env bash
# Usage: ./deploy.sh <namespace> <image-tag>
# Example: ./deploy.sh igolo-dev abc123sha
#
# Deploys all three services (backend, frontend, floorplan-ai) to the
# specified Kubernetes namespace using the given image tag.
# NOTE: Make this file executable with: chmod +x infra/scripts/deploy.sh

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
NAMESPACE="${1:-}"
IMAGE_TAG="${2:-}"

if [[ -z "$NAMESPACE" || -z "$IMAGE_TAG" ]]; then
  die "Usage: $0 <namespace> <image-tag>"
fi

if [[ "$NAMESPACE" != "igolo-dev" && "$NAMESPACE" != "igolo-prod" ]]; then
  die "Namespace must be 'igolo-dev' or 'igolo-prod'. Got: $NAMESPACE"
fi

# Derive overlay from namespace (igolo-dev -> dev, igolo-prod -> prod)
OVERLAY="${NAMESPACE#igolo-}"

# ── Resolve paths ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

OVERLAY_DIR="$REPO_ROOT/infra/k8s/overlays/$OVERLAY"
MIGRATION_MANIFEST="$REPO_ROOT/infra/k8s/base/migration-job.yaml"

if [[ ! -d "$OVERLAY_DIR" ]]; then
  die "Kustomize overlay not found: $OVERLAY_DIR"
fi

# ── ECR registry (requires AWS_ACCOUNT_ID and AWS_REGION env vars) ─
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID env var is required}"
AWS_REGION="${AWS_REGION:?AWS_REGION env var is required}"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

DEPLOYMENTS=("igolo-backend" "igolo-frontend" "igolo-floorplan-ai")
CONTAINERS=("backend" "frontend" "floorplan-ai")
ECR_REPOS=("igolo-backend" "igolo-frontend" "igolo-floorplan-ai")

# ── Step 1: Run database migration ─────────────────────────────────
info "Running database migration in $NAMESPACE ..."
kubectl delete job igolo-migration -n "$NAMESPACE" --ignore-not-found=true
kubectl apply -f "$MIGRATION_MANIFEST" -n "$NAMESPACE"

info "Waiting for migration job to complete (timeout: 120s) ..."
if ! kubectl wait --for=condition=complete job/igolo-migration -n "$NAMESPACE" --timeout=120s; then
  error "Migration job failed. Dumping logs:"
  kubectl logs job/igolo-migration -n "$NAMESPACE" --tail=50 || true
  die "Aborting deploy due to migration failure."
fi
info "Migration complete."

# ── Step 2: Apply kustomize overlay ─────────────────────────────────
info "Applying kustomize overlay: $OVERLAY_DIR"
kubectl apply -k "$OVERLAY_DIR"

# ── Step 3: Set image tags on all deployments ───────────────────────
for i in "${!DEPLOYMENTS[@]}"; do
  DEPLOY="${DEPLOYMENTS[$i]}"
  CONTAINER="${CONTAINERS[$i]}"
  IMAGE="${ECR_BASE}/${ECR_REPOS[$i]}:${IMAGE_TAG}"

  info "Setting $DEPLOY -> $IMAGE"
  kubectl set image "deployment/$DEPLOY" "$CONTAINER=$IMAGE" -n "$NAMESPACE"
done

# ── Step 4: Wait for rollouts ───────────────────────────────────────
FAILED=0
for DEPLOY in "${DEPLOYMENTS[@]}"; do
  info "Waiting for rollout: $DEPLOY (timeout: 180s) ..."
  if ! kubectl rollout status "deployment/$DEPLOY" -n "$NAMESPACE" --timeout=180s; then
    error "Rollout failed for $DEPLOY"
    FAILED=1
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  error "One or more rollouts failed. Consider running: ./rollback.sh $NAMESPACE"
  exit 1
fi

# ── Done ────────────────────────────────────────────────────────────
info "Deployment complete. All services running with tag: $IMAGE_TAG"
echo ""
kubectl get deployments -n "$NAMESPACE" -o wide
