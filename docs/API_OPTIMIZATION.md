# API optimization proposal

Goal: fewer frontend round-trips, lower latency, and a more consistent contract.
Forward-looking only — derived from the current frontend request patterns.

## Current per-page backend fan-out (server render)

| Page | Backend GETs today | Calls |
|---|---|---|
| Video `/video/{slug}` | **5** | `videos/{slug}` + `…/related/` + `…/next/` + `videos/popular` + `seo/video/{slug}` |
| Tag/Category `/tag\|category/{slug}` | **4 + N** | detail + `videos/?…` + `videos/related-filters/?…` + `seo/…` + N per-slug label lookups for active refine |
| Home with filters `/` | **2 + N** | `videos/?…` + `related-filters/?…` + N per-slug label lookups |
| Actor `/actor/{slug}` | **3** | `actors/{slug}` + `videos/?actors=` + `seo/actor/{slug}` |
| Collection `/collection/{slug}` | **3** | `collections/{slug}` + `…/videos/` + `seo/collection/{slug}` |

The two structural costs: **(1) SEO is always a second request** next to the entity, and
**(2) refine pages need a separate facets call + per-slug name lookups**. Client reads also take an
extra hop through a same-origin proxy.

---

## A. Cut round-trips (biggest wins)

### A1. Fold SEO into the entity/detail response — *high impact, low effort*
Every public detail page fetches `/seo/{type}/{slug}/` in addition to the entity. Return the SEO block
(canonical, robots, hreflang `alternates`, `meta`, `json_ld`) **inside** the detail response, or behind
`?include=seo`. → Video/Tag/Category/Actor/Collection: −1 request each, and SEO can never drift from the
entity it describes.

### A2. `?include=` (expand) on detail/list endpoints — *high impact, medium effort*
One generic, cache-friendly convention instead of many sub-endpoints:
- `GET /videos/{slug}/?include=seo,related,next,popular` → video page **5 → 1**.
- `GET /videos/?…&include=related_filters,seo` → returns the page **and** the refine facets in one call
  (tag/category/home-filtered: **2 → 1**). `related-filters` already returns
  `related.{tags,categories,actors,attributes}` — reuse that shape as an embedded field.

### A3. Echo resolved filter labels — *high impact, low effort (removes an N+1)*
The frontend resolves each active filter slug → localized name via per-slug
`tags|categories|actors/{slug}/` calls. Instead, have `/videos/` and `related-filters` return an
`applied_filters` block with `{slug,name}` for every applied filter (`include_tags`, `exclude_tags`,
`categories`, `actors`, `actor_*`). → removes up to N requests per filtered page.
Alternative: a batch `GET /labels/?tags=a,b&categories=c&actors=d&actor_country=…&lang=ru` → `{slug:name}`.

### A4. Per-user state inline — *medium*
`POST /me/videos/state/` (batch favorited/reaction) is a good pattern — keep it. Additionally allow
authenticated list/detail to embed it via `?include=me` (`is_favorited`, `my_reaction`) so `/me/*`
feeds and the subscription feed don't need a second batch round-trip.

---

## B. Architecture & consistency

### B1. One filtering surface
Standardize listing on `/videos/?categories=…&include_tags=…&actors=…&actor_*=…`. The frontend already
builds every tag/category/actor/home list from it; the dedicated `/{entity}/{slug}/videos/` endpoints
are redundant and can be retired. Fewer endpoints → less drift.

### B2. Single source of truth for filter parsing
`/videos/`, `related-filters`, and `/me/feed/` should share one server-side filter parser so they always
agree: a subscription, its feed, its "show all" catalog link, and the refine facets must resolve to the
identical query for every filter key (including `actor_*`).

### B3. Unify pagination
The API mixes **cursor** (`/videos/`) and **page-number** (`/actors/`, `/me/*`). Standardize on cursor for
large/volatile lists with absolute `next`/`previous`. Reduces client special-casing and avoids page drift
when items are inserted mid-scroll.

---

## C. Caching & transport (latency + load)

### C1. Real HTTP caching headers on public GETs — *high impact*
Add `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` plus `ETag`/`Last-Modified` and `304`.
A CDN/edge and the Next Data Cache then serve most reads without touching the app, and SWR keeps them
fresh — more effective than app-level `revalidate` alone.

### C2. Let the browser read the API directly (drop the proxy hop)
Client reads currently go through a same-origin proxy. With reliable cross-origin GETs (correct CORS on
both fresh and cached responses), the browser/CDN can read the API directly and the extra hop disappears.

### C3. Surrogate keys / cache tags for targeted purge
Tag cached responses (`video:{uuid}`, `category:{slug}`, `list:videos`) so a publish/edit purges exactly
the affected entries on write — keeps counts and lists fresh without resorting to short TTLs.

### C4. Throttle buckets
Keep anonymous cached reads in a separate (or bypassed) throttle bucket from authenticated mutations, so
public browsing scales independently of write limits.

---

## D. Payload efficiency

### D1. Responsive image variants from the backend
Provide width variants / a thumbnail service (srcset-ready URLs) so the image optimizer isn't on the
critical path. Faster LCP on card grids.

### D2. Sparse fieldsets (optional)
`?fields=` on list endpoints for lean card payloads — only if payload size becomes an issue.

---

## Priority

| # | Change | Impact | Effort |
|---|---|---|---|
| A1 | SEO inside detail (or `?include=seo`) | High | Low |
| A3 | `applied_filters` labels on list/related-filters | High | Low |
| C1 | HTTP cache headers + ETag/SWR | High | Medium |
| A2 | `?include=related,next,popular,related_filters` | High | Medium |
| B2 | Shared filter parser across list/related-filters/feed | Medium | Low |
| B1 | Retire redundant `/{entity}/{slug}/videos/` | Medium | Low |
| C2 | Direct browser/CDN reads (drop proxy hop) | Medium | Medium |
| A4 | `?include=me` per-user state | Medium | Medium |
| C3 | Surrogate-key purge for fresh counts | Medium | Medium |
| B3 | Unified cursor pagination | Medium | Medium |
| D1 | Responsive image variants | Medium | Medium |

**If only three:** A1 (SEO inline), A3 (echo filter labels), C1 (HTTP caching). Together they take the
video page 5→4 and every filtered page `2+N`→1, and offload most reads to the CDN/Next cache.
