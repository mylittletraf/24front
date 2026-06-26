# Frontend production deploy (`!prod/`)

Self-contained inventory for running the frontend in production. Same model as the
backend: **build once on a build host → push to the registry → the server only
pulls.** The server never builds.

- **Image:** `registry.cpapony.com/frontend24` (tags: short git SHA + `latest`)
- **Runtime:** Next.js SSR (standalone Node server) on `:3000`, no published host
  ports — it registers with the shared edge as a virtual host.
- **TLS / edge:** reuses the backend's `nginx-proxy` + `acme-companion` on the
  external `ingress_proxy` network (same host). This bundle does **not** ship an
  edge stack.

## 1. Build & push (build host)

```bash
docker login registry.cpapony.com          # once
cp .env.build.example .env.build            # at the repo root; fill in this site's
                                            # public identity (NEXT_PUBLIC_*, API_INTERNAL_URL)
./build.sh                                  # tag = short git SHA (+ :latest)
# ./build.sh v1.2.3                         # explicit tag
# PUSH_LATEST=0 ./build.sh v1.2.3           # tag only, don't move :latest
```

`NEXT_PUBLIC_*` are **inlined into the bundle at build time** (Next.js limitation),
so the image carries this one site's public identity. `build.sh` forwards them as
`--build-arg` from `.env.build`. The browser→API path is *not* baked: it uses the
same-origin `/api/proxy` at runtime, so it follows whatever domain the image serves.

## 2. First run (server)

```bash
cd '!prod'                                  # the leading ! sorts it to the top; always quote it
cp .env.example .env                        # fill DOMAIN, ACME_EMAIL, API_INTERNAL_URL
scripts/init-server.sh                      # validates .env, ensures ingress_proxy, pull + up -d
```

The backend's edge must already be running on this host (it owns `:80`/`:443` and
issues the cert). DNS for `DOMAIN` must point here before the cert can be issued.

## 3. Updates / rollback (server)

```bash
cd '!prod'
# deploy latest:
scripts/deploy.sh                           # pull → up -d  (no DB/migrations — stateless)
# pin or roll back a specific build:
#   set FRONTEND_TAG=<sha> in .env, then:
scripts/deploy.sh
```

## Configuration split

| Where | What | Why |
| --- | --- | --- |
| `.env.build` (build host, repo root) | `NEXT_PUBLIC_*`, `API_INTERNAL_URL` | Inlined into the client bundle at build; also fixes the sitemap/robots rewrites baked into `next.config.ts`. |
| `!prod/.env` (server) | `FRONTEND_TAG`, `DOMAIN`, `ACME_EMAIL`, `API_INTERNAL_URL`, `MEDIA_INTERNAL_HOSTS` | Server-side runtime config + edge registration; changeable per deploy without a rebuild. |

`API_INTERNAL_URL` appears in both: build-time (sitemap/robots rewrites) and
runtime (SSR fetches). Use the same value.

## Separate-host note

If the frontend runs on a **different** host than the backend (no existing edge),
it needs its own TLS edge. That's bundled in [`standalone-edge/`](standalone-edge/);
just add `--with-edge` on first run:

```bash
cd '!prod'
cp .env.example .env                # API_INTERNAL_URL must be routable from this host
scripts/init-server.sh --with-edge  # starts standalone-edge/ then the frontend
```

On a shared host, omit the flag (default) — the frontend reuses the backend's edge.
