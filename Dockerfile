# syntax=docker/dockerfile:1
# Production image for the Next.js 16 frontend (SSR / standalone Node server).
#
# Built and pushed on a build host (build.sh at the repo root); the prod server
# only pulls. Public NEXT_PUBLIC_* config is inlined at build time (passed as
# --build-args by build.sh) — see !prod/README.md for why. Server-side runtime
# config (API_INTERNAL_URL, MEDIA_INTERNAL_HOSTS) is supplied by the container.
FROM node:24-alpine AS base
# Next.js' SWC/sharp binaries need glibc compat on musl (alpine).
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- dependencies (cached layer) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public config — inlined into the client bundle by `next build`. ENV beats any
# .env file at build time, so these win. API_INTERNAL_URL is also needed here
# because next.config.ts rewrites() (sitemap/robots → backend) is evaluated at
# build time and baked into the routes manifest.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_DEFAULT_LANG
ARG NEXT_PUBLIC_ADULT_CONTENT
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_YM_ID
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_YANDEX_VERIFICATION
ARG NEXT_PUBLIC_SENTRY_DSN
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME \
    NEXT_PUBLIC_SITE_DESCRIPTION=$NEXT_PUBLIC_SITE_DESCRIPTION \
    NEXT_PUBLIC_DEFAULT_LANG=$NEXT_PUBLIC_DEFAULT_LANG \
    NEXT_PUBLIC_ADULT_CONTENT=$NEXT_PUBLIC_ADULT_CONTENT \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_YM_ID=$NEXT_PUBLIC_YM_ID \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_YANDEX_VERIFICATION=$NEXT_PUBLIC_YANDEX_VERIFICATION \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner (slim) ---
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone output bundles only the prod deps it traced — no dev tools, no full
# node_modules. public/ and .next/static aren't included by standalone, so copy
# them explicitly next to server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
