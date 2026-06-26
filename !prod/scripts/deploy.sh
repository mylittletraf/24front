#!/usr/bin/env bash
# Redeploy the frontend after a new image is published: pull, then restart.
#
# The image is built+pushed separately on a build host (../build.sh at repo root);
# this server only pulls. Deploy a specific build by setting FRONTEND_TAG in .env
# (defaults to `latest`), then run this. The frontend is stateless — no DB backup,
# migrations or data steps (unlike the backend's deploy.sh).
#
# Usage:
#   scripts/deploy.sh        # pull → up -d
#   scripts/deploy.sh -y     # skip confirmation
set -euo pipefail

cd "$(dirname "$0")/.."

APP_COMPOSE="docker compose -f docker-compose.yml"
ASSUME_YES=false

while [ $# -gt 0 ]; do
    case "$1" in
        -y|--yes) ASSUME_YES=true; shift ;;
        -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# Surface the tag being deployed (for the confirmation + logs).
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

if [ "$ASSUME_YES" != true ]; then
    read -rp "Deploy frontend (FRONTEND_TAG=${FRONTEND_TAG:-latest}) to production? [y/N] " ans
    [ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "Aborted."; exit 0; }
fi

echo "→ Pulling image (FRONTEND_TAG=${FRONTEND_TAG:-latest}) ..."
$APP_COMPOSE pull

echo "→ Restarting service ..."
$APP_COMPOSE up -d

cat <<EOF

✓ Deploy complete. Verify:
    curl -I https://${DOMAIN:-your-domain}/
    $APP_COMPOSE logs -f --tail=50 frontend
EOF
