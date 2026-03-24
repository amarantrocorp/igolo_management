#!/usr/bin/env bash
# Usage: ./rollback.sh <namespace> [deployment] [revision]
# Examples:
#   ./rollback.sh igolo-dev                    # Roll back ALL 3 deployments
#   ./rollback.sh igolo-dev igolo-backend      # Roll back only backend
#   ./rollback.sh igolo-dev igolo-backend 3    # Roll back backend to revision 3
#
# NOTE: Make this file executable with: chmod +x infra/scripts/rollback.sh

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
DEPLOYMENT="${2:-}"
REVISION="${3:-}"

if [[ -z "$NAMESPACE" ]]; then
  die "Usage: $0 <namespace> [deployment] [revision]"
fi

if [[ "$NAMESPACE" != "igolo-dev" && "$NAMESPACE" != "igolo-prod" ]]; then
  die "Namespace must be 'igolo-dev' or 'igolo-prod'. Got: $NAMESPACE"
fi

ALL_DEPLOYMENTS=("igolo-backend" "igolo-frontend" "igolo-floorplan-ai")

# ── Determine targets ──────────────────────────────────────────────
if [[ -n "$DEPLOYMENT" ]]; then
  TARGETS=("$DEPLOYMENT")
else
  TARGETS=("${ALL_DEPLOYMENTS[@]}")
  warn "No deployment specified — rolling back ALL deployments."
fi

# ── Show current state ──────────────────────────────────────────────
info "Current deployment state in $NAMESPACE:"
for DEPLOY in "${TARGETS[@]}"; do
  echo "---"
  echo "Deployment: $DEPLOY"
  kubectl rollout history "deployment/$DEPLOY" -n "$NAMESPACE" 2>/dev/null | tail -5 || true
  echo ""
done

# ── Perform rollback ───────────────────────────────────────────────
for DEPLOY in "${TARGETS[@]}"; do
  if [[ -n "$REVISION" ]]; then
    info "Rolling back $DEPLOY to revision $REVISION ..."
    kubectl rollout undo "deployment/$DEPLOY" -n "$NAMESPACE" --to-revision="$REVISION"
  else
    info "Rolling back $DEPLOY to previous revision ..."
    kubectl rollout undo "deployment/$DEPLOY" -n "$NAMESPACE"
  fi
done

# ── Wait for rollouts ──────────────────────────────────────────────
for DEPLOY in "${TARGETS[@]}"; do
  info "Waiting for rollout: $DEPLOY (timeout: 180s) ..."
  if ! kubectl rollout status "deployment/$DEPLOY" -n "$NAMESPACE" --timeout=180s; then
    error "Rollback rollout failed for $DEPLOY — manual intervention required."
  fi
done

# ── Show result ─────────────────────────────────────────────────────
info "Rollback complete. Current state:"
kubectl get deployments -n "$NAMESPACE" -o wide
