# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Public frontend for a tube/video site. Next.js 16 (App Router, React 19, TS strict), Tailwind v4,
TanStack Query v5, Video.js + HLS, Radix UI, React Hook Form + Zod, next-intl, next-themes, Sentry.
It is a **thin client over a separate Django/DRF backend** at `http://127.0.0.1:8000/api/v1` (already
running in dev — do not start it). When the API contract is ambiguous, `curl` the live backend to see
the real response rather than guessing.

## Commands

```bash
npm run dev            # dev server — the USER runs this; do not start/stop it yourself
npm run build          # production build (the real validation: ~13 dynamic routes)
npm run check-all      # type-check + lint + prettier:check — run before every commit
npm run type-check     # tsc --noEmit
npm run lint           # eslint, --max-warnings 0 (warnings fail)
npm run prettier:write # auto-format (run this if prettier:check fails)
```

There are **no automated tests** in this repo. Validate changes with `npm run check-all` and
`npm run build`, plus manual checks against the live backend (`curl`) or the user's dev server.

Workflow: after each logical change, run `check-all`, fix issues, then make one focused commit (do
not batch unrelated changes). Commit only when green.

## Architecture

### Two backends-of-record, two ways to call the API
- **Public reads** (catalog, detail pages, SEO) go straight from **Server Components** via
  `apiFetch` (`src/lib/api/fetcher.ts`) using `API_INTERNAL_URL` (server) — supports Next ISR
  (`revalidate`). Each domain has a typed module under `src/lib/api/` that fetches + Zod-parses.
- **Authed reads/mutations** go from the browser through the **same-origin proxy**
  `src/app/api/proxy/[...path]/route.ts`. Cursor/page `next`/`previous` URLs are masked to proxy
  paths (`toProxyPath`) so the API host never leaks into SSR payloads.
- Addressing: public entities are fetched **by translated `slug`**; mutations/actions are **by `uuid`**.
- Pagination is mixed: **cursor** (video feeds, comments) vs **page-number** (actors, tags, search,
  `/me/*`). Helpers in `src/lib/api/types.ts`.

### Auth = hybrid BFF (`src/app/api/bff/auth/[action]/route.ts` + `src/lib/auth/`)
The browser never touches backend auth endpoints. The BFF keeps the **refresh token in an httpOnly
cookie** and returns **access in the JSON body**; the client holds access **in memory only**
(`auth-context.tsx`, `tokenRef`). On every page load `AuthProvider` bootstraps via
`GET /api/bff/auth/session` → backend `/auth/refresh/`. The refresh token is **long-lived and not
rotated** (the BFF re-sets the same cookie to slide its expiry; see `cookies.ts`). `bffSession`/
`bffRefresh` are **coalesced** so concurrent calls share one request. Pass the in-memory token from
`useAuth().getToken()` into authed API helpers.

### Localization: UI locale ≠ content language
- **UI locale** (next-intl, no-routing): from the `NEXT_LOCALE` cookie / `Accept-Language`; messages
  in `src/messages/{ru,en,es,de,fr,zh}.json`. Adding a string means adding the key to **all 6** files.
- **Content language**: the `?lang=` query param sent to the backend (falls back to `NEXT_LOCALE` then
  default). `language`/`fallback_language` come back in responses; **slugs differ per language**
  (`slugs`/`alternates`) — used for hreflang and the language switcher.

### Media URL masking (`src/lib/media.ts` + `next.config.ts` rewrites)
Backend storage URLs (`http://storage:8000/local-storage/...`) are masked to same-origin `/media/...`
in page output (`toMediaUrl`, applied inside the Zod schemas via `NullableMedia`/`MediaArray`).
`/media/*` is rewritten back to the storage host server-side. Use `toPublicMediaUrl`/`maskMediaDeep`
for absolute URLs in SEO/JSON-LD.

### SEO: the frontend owns structured data
`generateMetadata` uses backend-provided meta (title/canonical/hreflang/robots/OG) via
`getSeo`/`seoToMetadata` (`src/lib/api/seo.ts`). **JSON-LD is built on the frontend**
(`src/lib/seo/structured-data.ts` + `screenshots.ts`) because it has more data than the backend's
minimal `seo.json_ld` — entity pages render the frontend graph (VideoObject/Person/CollectionPage +
BreadcrumbList/ItemList/FAQPage/ImageObject) and do **not** print the backend `json_ld`. Raw
`<meta property>` (Yandex OVS, age-restriction) is emitted via a component (`raw-meta.tsx`) since
Next's metadata API only does `name=`. See `docs/SEO_VIDEO.md`.

### Catalog filters & shared taxonomy pages
`src/lib/filters.ts` defines `VideoFilters` (CSV-slug params) + parse/serialize/api helpers.
`src/components/catalog/entity-video-page.tsx` is one component shared by `/tag`, `/category` and
`/studio` (`kind` + `KIND_CONF` per-taxonomy config: route base, redirect entity, breadcrumb,
base-filter key). On 404, detail pages check `/redirects/` before `notFound()`.

### Subscriptions
The Subscribe button (`save-filter-button.tsx`) follows a single entity (`category|tag|studio|actor`):
status comes from the batched `POST /me/subscriptions/state/`, toggle is instant (create single-base /
delete by `subscription_uuid`). On the home page (arbitrary filter combos) it falls back to a
naming-dialog "save filter" flow. Public subscriber counts (`subscribers_count`) render inside the button.

### Providers & data layer
`src/app/providers.tsx` nests Theme → QueryClient → Auth → VideoState → FeedUnread → AuthUI. SSR
prefetch → `HydrationBoundary` → Client Component (avoid double-fetch). `VideoStateProvider` batches
per-video favorite/reaction state; `FeedUnreadProvider` polls the feed badge.

### Player & ads
`src/components/video/player.tsx` (Video.js + HLS) resolves VAST (Google IMA) **before** creating the
player. `/embed/[slug]` is a chrome-less iframe player (noindex) referenced from `og:video`. Ad slots
and VAST placements are documented in `docs/ADS_GUIDE.md`.

## Conventions
- Tailwind v4 with CSS `@theme` tokens in `src/app/globals.css` (`bg-surface`, `text-muted`,
  `border-border`, `text-accent`, …). Dark mode via `.dark` class + next-themes. The custom
  responsive variant `desktop:` = 1024px.
- Validate every external response with Zod; keep schemas **lenient** (optional/`.catch`) so one bad
  row or a new backend field never breaks a page.
- Run `npm run prettier:write` before committing — prettier failures block `check-all`.

## Reference docs (`docs/`)
`FRONTEND_SPEC.md` (API contract), `UI_SPEC.md`, `SHORTS_FRONTEND_SPEC.md`, `SEO_VIDEO.md`,
`ADS_GUIDE.md`, `ANALYTICS.md`, `API_OPTIMIZATION.md` + `API_OPTIMIZATION_TASK.md` (backend handoff),
`MEDIA_PROTECTION_BACKEND_TASK.md` (signed-URL plan), `filter-subscriptions-frontend.md`,
`BACKEND_BUGS.md` (known backend gaps / frontend workarounds), `BRANDING.md`.

## Environment (`.env.local`, see `.env.example`)
`API_INTERNAL_URL` (server→backend), `NEXT_PUBLIC_API_URL` (browser→backend), `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_DEFAULT_LANG`, `NEXT_PUBLIC_ADULT_CONTENT` (gates 18+/age markup),
`NEXT_PUBLIC_MEDIA_STRIP_PREFIX`/`MEDIA_ORIGIN` (media masking), analytics + verification tokens.
