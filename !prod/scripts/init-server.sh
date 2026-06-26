#!/usr/bin/env bash
# First-time production bootstrap for the frontend: install Docker if missing,
# validate .env, ensure the shared edge network exists, then pull the image and
# bring the service up.
#
# Shared host (default): this host already runs the backend's edge (nginx-proxy +
# acme-companion on the external `ingress_proxy` network) — the frontend just
# registers with it as a virtual host, so we do NOT start an edge here.
#
# Separate host (--with-edge): the frontend is alone on its own VDS with no edge
# to reuse, so also bring up the standalone edge from standalone-edge/ first.
#
# Usage:
#   scripts/init-server.sh              # shared host — reuse the backend's edge
#   scripts/init-server.sh --with-edge  # separate host — also start our own edge
set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK="ingress_proxy"
WITH_EDGE=false

while [ $# -gt 0 ]; do
    case "$1" in
        --with-edge) WITH_EDGE=true; shift ;;
        -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

# 0) Docker must be installed (auto-installed if missing), running, and ship the
#    compose v2 plugin. The official convenience script installs both.
SUDO=""
[ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1 && SUDO="sudo"

install_docker() {
    echo "→ Docker not found — installing via https://get.docker.com ..."
    if ! command -v curl >/dev/null 2>&1; then
        echo "✗ curl is required to auto-install Docker. Install Docker manually and re-run:" >&2
        echo "  https://docs.docker.com/engine/install/" >&2
        exit 1
    fi
    if [ "$(id -u)" -ne 0 ] && [ -z "$SUDO" ]; then
        echo "✗ Need root or sudo to install Docker. Re-run as root or install it manually." >&2
        exit 1
    fi
    curl -fsSL https://get.docker.com | $SUDO sh
    # Enable + start the daemon on systemd hosts.
    if command -v systemctl >/dev/null 2>&1; then
        $SUDO systemctl enable --now docker || true
    fi
    # Let the invoking user run docker without sudo from their next login onward.
    if [ -n "$SUDO" ]; then
        $SUDO usermod -aG docker "${USER:-$(id -un)}" || true
    fi
}

command -v docker >/dev/null 2>&1 || install_docker

# Pick how to call docker: directly if allowed, else via sudo. The sudo fallback
# covers a freshly installed daemon where this user isn't in the 'docker' group
# until the next login.
if docker info >/dev/null 2>&1; then
    DOCKER="docker"
elif [ -n "$SUDO" ] && $SUDO docker info >/dev/null 2>&1; then
    DOCKER="$SUDO docker"
else
    echo "✗ Docker is installed but the daemon isn't reachable. Start it" >&2
    echo "  (e.g. 'sudo systemctl start docker') and re-run." >&2
    exit 1
fi

if ! $DOCKER compose version >/dev/null 2>&1; then
    echo "✗ The Docker Compose v2 plugin is missing ('docker compose'). Install it:" >&2
    echo "  https://docs.docker.com/compose/install/" >&2
    exit 1
fi
echo "✓ Docker $($DOCKER version -f '{{.Server.Version}}' 2>/dev/null) with compose plugin ready."

APP_COMPOSE="$DOCKER compose -f docker-compose.yml"
EDGE_COMPOSE="$DOCKER compose --env-file .env -f standalone-edge/nginx-proxy-compose.yml"

# 1) .env must exist and be filled.
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✗ No .env found — created one from .env.example."
    echo "  Fill in DOMAIN, ACME_EMAIL, API_INTERNAL_URL and re-run." >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

fail=false
require() {
    local name="$1" placeholder="$2"
    local val="${!name:-}"
    if [ -z "$val" ] || { [ -n "$placeholder" ] && [ "$val" = "$placeholder" ]; }; then
        echo "✗ $name is unset or still a placeholder in .env" >&2
        fail=true
    fi
}
require DOMAIN "example.com"
require ACME_EMAIL "admin@example.com"
require API_INTERNAL_URL "https://backend.example.com/api/v1"
[ "$fail" = true ] && { echo "Fix .env and re-run." >&2; exit 1; }

# 2) Shared edge network (external). On a shared host the backend's init created
#    it; create it if absent (idempotent).
if $DOCKER network inspect "$NETWORK" >/dev/null 2>&1; then
    echo "✓ Network '$NETWORK' already exists."
else
    echo "→ Network '$NETWORK' missing — creating it."
    $DOCKER network create "$NETWORK"
fi

# 2b) Edge (TLS). Separate host: bring up our own edge from standalone-edge/.
#     Shared host: reuse the backend's edge — just remind that it must be up.
if [ "$WITH_EDGE" = true ]; then
    echo "→ Starting standalone edge (nginx-proxy + acme-companion) ..."
    $EDGE_COMPOSE up -d
else
    echo "  ⓘ Reusing the backend's edge on this host. It (nginx-proxy +"
    echo "    acme-companion) must be running for TLS — on a separate host re-run"
    echo "    with --with-edge to start one here."
fi

# 3) Pull the image and start.
echo "→ Pulling image (FRONTEND_TAG=${FRONTEND_TAG:-latest}) ..."
$APP_COMPOSE pull

echo "→ Starting frontend ..."
$APP_COMPOSE up -d

if [ "$WITH_EDGE" = true ]; then
    acme_logs="$EDGE_COMPOSE logs -f acme-companion"
else
    acme_logs="(on the backend's edge stack) docker compose logs -f acme-companion"
fi

cat <<EOF

✓ Frontend is up. Next steps:
  1) Watch the cert get issued (DNS for $DOMAIN must point to this host first):
       $acme_logs
  2) Verify:
       curl -I https://$DOMAIN/
       $APP_COMPOSE logs -f --tail=50 frontend
EOF
