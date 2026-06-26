# Standalone edge (separate-host only)

Use this **only when the frontend runs on its own host** (a dedicated VDS) with no
backend edge to reuse. It's the TLS terminator + Let's Encrypt issuer
(`nginx-proxy` + `acme-companion`) that the frontend registers with as a virtual
host on the `ingress_proxy` network.

**On a shared host (frontend + backend together), ignore this folder** — the
frontend joins the backend's existing edge automatically.

## Usage

The frontend installer wires this up for you:

```bash
cd '!prod'
cp .env.example .env          # fill DOMAIN, ACME_EMAIL, API_INTERNAL_URL
scripts/init-server.sh --with-edge
```

`--with-edge` creates the `ingress_proxy` network, brings up this edge (reusing
`!prod/.env` for `ACME_EMAIL`), then starts the frontend.

Manual equivalent (run from `!prod/`):

```bash
docker network create ingress_proxy
docker compose --env-file .env -f standalone-edge/nginx-proxy-compose.yml up -d
docker compose -f docker-compose.yml up -d
```

## Notes

- DNS for `DOMAIN` must point to **this** host before the cert can be issued.
- `API_INTERNAL_URL` (in `.env` and baked at build) must be a routable address of
  the backend from this host — its public origin (`https://api.example.com/api/v1`)
  or a private-network address if both hosts share one.
- Watch issuance: `docker compose -f standalone-edge/nginx-proxy-compose.yml logs -f acme-companion`.
- This edge owns ports 80/443 on the host. Don't run another edge alongside it.
