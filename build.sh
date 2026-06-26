#!/usr/bin/env bash
# Build the frontend image and push it to the registry.
#
# Runs on a build host (where the full source lives) — the prod server only pulls.
# `docker login registry.cpapony.com` must already have been done. Pushes the
# given version tag and (unless disabled) moves `latest`. The prod stack
# (!prod/docker-compose.yml) pulls registry.cpapony.com/frontend24 by ${FRONTEND_TAG}.
#
# Public NEXT_PUBLIC_* config is inlined into the bundle at build time, so it is
# passed here as --build-arg (this image is tied to one site's public identity).
# Set those values in ./.env.build (gitignored; copy from .env.build.example).
#
# Usage:
#   ./build.sh                      # version = short git SHA (+ :latest)
#   ./build.sh v1.2.3               # version = v1.2.3      (+ :latest)
#   IMAGE=registry.cpapony.com/frontend24 ./build.sh 2026-06-23
#   PUSH_LATEST=0 ./build.sh v1.2.3 # tag only, don't move :latest
set -euo pipefail

cd "$(dirname "$0")"

IMAGE="${IMAGE:-registry.cpapony.com/frontend24}"
VERSION="${1:-$(git rev-parse --short HEAD)}"
PUSH_LATEST="${PUSH_LATEST:-1}"

# Build-time public config (see .env.build.example). Sourced into the environment
# so each NEXT_PUBLIC_* below is forwarded as a --build-arg.
if [ -f .env.build ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env.build
    set +a
fi

# Forward only the vars that are set (unset → Docker uses the schema default,
# which falls back to the app's own defaults in src/lib/api/config.ts etc.).
build_args=()
for var in \
    NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SITE_NAME NEXT_PUBLIC_SITE_DESCRIPTION \
    NEXT_PUBLIC_DEFAULT_LANG NEXT_PUBLIC_ADULT_CONTENT NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA_ID NEXT_PUBLIC_YM_ID NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION NEXT_PUBLIC_YANDEX_VERIFICATION \
    NEXT_PUBLIC_SENTRY_DSN API_INTERNAL_URL; do
    if [ -n "${!var:-}" ]; then
        build_args+=(--build-arg "$var=${!var}")
    fi
done

tags=(-t "$IMAGE:$VERSION")
[ "$PUSH_LATEST" = "1" ] && tags+=(-t "$IMAGE:latest")

echo "→ Building $IMAGE:$VERSION ..."
docker build "${tags[@]}" "${build_args[@]}" .

echo "→ Pushing $IMAGE:$VERSION ..."
docker push "$IMAGE:$VERSION"
if [ "$PUSH_LATEST" = "1" ]; then
    echo "→ Pushing $IMAGE:latest ..."
    docker push "$IMAGE:latest"
fi

echo "✓ Pushed $IMAGE:$VERSION$([ "$PUSH_LATEST" = "1" ] && echo ' (+ :latest)')"
echo "  On the server: set FRONTEND_TAG=$VERSION in !prod/.env (or keep 'latest') and run scripts/deploy.sh"
