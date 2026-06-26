# API optimization — backend task (24g)

Actionable handoff for the backend (`24g`) team to cut **request volume and fan-out** from the
frontend. Rationale and the full option survey live in [`API_OPTIMIZATION.md`](./API_OPTIMIZATION.md);
**this file is the task** — concrete request/response contracts the frontend will adopt, ordered by
impact/effort.

The backend is already solid on DB load (denormalized + Redis-buffered + Celery-flushed counters,
cached list/detail/SEO endpoints, split card/detail serializers, paginated lists). So the wins here
are **fewer round-trips per page** and **offloading reads to a CDN**, not query tuning.

Contracts below reuse shapes the frontend already parses, so adoption needs no schema rework:
- `related` block → `src/lib/api/related.ts` (`RelatedFiltersSchema.related`).
- `seo` block → `src/lib/api/seo.ts` (`SeoSchema`).

> Already DELIVERED, out of scope: auth-refresh throttle (`AUTH_THROTTLE_TASK.md`), SEO data fields
> + sitemaps (`SEO_BACK_IMPROVE_TASK.md`).

---

## Current per-page fan-out (what we're collapsing)

| Page | Backend GETs today |
|---|---|
| Video `/video/{slug}` | **5** — `videos/{slug}` + `…/related/` + `…/next/` + `videos/popular` + `seo/video/{slug}` |
| Tag/Category `/tag\|category/{slug}` | **2 + N** — `videos/?…` + `videos/related-filters/?…` + N per-slug label lookups |
| Home (filtered) `/` | **2 + N** — `videos/?…` + `related-filters/?…` + N per-slug label lookups |
| Actor `/actor/{slug}` | **3** — `actors/{slug}` + `videos/?actors=` + `seo/actor/{slug}` |

---

## Task 1 — `?include=` expansion (collapse fan-out) · high impact

Add an opt-in `include` query param (CSV) that embeds related payloads as nested fields. Absent →
response is byte-for-byte what it is today (backward compatible). Unknown tokens ignored.

### 1a. Video detail: `GET /videos/{slug}/?include=seo,related,next,popular&lang=ru`
Embeds, as optional top-level keys on the existing detail object:
- `seo`: the **exact** `/seo/video/{slug}/` body (the `SeoSchema` shape — `canonical`, `robots`,
  `alternates`, `meta{title,description,h1,image,open_graph,twitter}`, `json_ld`).
- `related`: array, same items as `/videos/{slug}/related/` (`VideoCard` shape).
- `next`: object|null, same as `/videos/{slug}/next/`.
- `popular`: array, same as `/videos/popular/?page_size=12`.

```jsonc
// GET /videos/luchshee-video/?include=seo,related,next,popular&lang=ru
{
  "uuid": "…", "duration": 1277, "views_count": 0, /* …existing detail fields… */
  "seo":     { "entity_type": "video", "canonical": "https://…", "robots": "index,follow",
               "alternates": { "en": "https://…" }, "meta": { /* … */ }, "json_ld": { /* … */ } },
  "related": [ { "uuid": "…", "duration": 612, /* VideoCard */ } ],
  "next":    { "uuid": "…", /* VideoCard */ },
  "popular": [ { "uuid": "…", /* VideoCard */ } ]
}
```
**Collapses video page 5 → 1.** Bonus: SEO can never drift from the entity it describes.

### 1b. Catalog/entity list: `GET /videos/?categories=…&include=related_filters,seo&lang=ru`
Embeds alongside the paginated `results`:
- `related_filters`: the `related` object from `/videos/related-filters/`
  (`{ tags, categories, actors, attributes }` — `RelatedFiltersSchema.related`).
- `seo`: the entity's SEO block (for `/tag`, `/category`, `/studio`, `/actor` pages).

**Collapses tag/category/home-filtered `2(+N) → 1`** (combined with Task 2 for the `N`).

Acceptance: with no `include`, responses unchanged; each embedded block equals the standalone
endpoint's body for the same params+lang; one DB/cache round-trip, not N.

---

## Task 2 — Echo resolved filter labels (kill the N+1) · high impact, low effort

Today the frontend resolves each active filter slug → localized name with a **per-slug** call
(`tags|categories|actors/{slug}/`) — `src/lib/api/filter-labels.ts`, up to N extra requests per
filtered page.

Have `/videos/` **and** `/videos/related-filters/` return an `applied_filters` array — one entry per
applied filter value across `include_tags`, `exclude_tags`, `categories`, `actors`, and every
`actor_*` (e.g. `actor_country`):

```jsonc
"applied_filters": [
  { "slug": "rossiya",   "name": "Россия",   "type": "actor_country" },
  { "slug": "blondinki", "name": "Блондинки", "type": "tag" }
]
```
`name` localized to `lang` (with the usual fallback). **Removes the entire `getFilterLabels`
fan-out** — the frontend reads names straight from the list response and deletes that file.

Acceptance: every slug the client sends as a filter appears once in `applied_filters` with a
localized `name`; ordering irrelevant.

---

## Task 3 — Real HTTP cache headers on public GETs · high impact (biggest absolute drop)

Public read endpoints currently rely on app-level caching only; the app is hit for every read.
Add standard HTTP caching so a CDN/edge + the Next Data Cache serve the bulk of reads without
touching the app:

- `Cache-Control: public, s-maxage=<ttl>, stale-while-revalidate=<window>` on catalog/detail/
  reference/SEO/sitemap GETs (TTLs can mirror the existing per-resource cache TTLs).
- `ETag` (or `Last-Modified`) + honor `If-None-Match`/`If-Modified-Since` → `304`.
- Pair with **surrogate-key / cache-tag purge** (`video:{uuid}`, `category:{slug}`, `list:videos`)
  on publish/edit, so TTLs can be long without serving stale counts/lists.
- Keep anonymous cached reads in a **separate throttle bucket** from authenticated mutations so
  public browsing scales independently of write limits.

Acceptance: a repeated anonymous GET returns `304` (or is served by the CDN) without a DB hit; a
publish purges exactly the affected keys.

---

## Dependencies / notes (not new work here, but blockers to flag)

- **Cross-language detail 404** (`BACKEND_BUGS.md`): `/videos/{slug}/?lang=en` 404s for slugs the
  `en` list returned — must fall back like the list endpoints. Blocks any slug-fallback and makes
  card clicks 404 in non-source languages. Fix this regardless of the above.
- **Signed-playback endpoint** (`MEDIA_PROTECTION_BACKEND_TASK.md`): `GET /videos/{uuid}/playback/`
  returning short-lived signed HLS lets video stream browser↔storage directly, taking that
  bandwidth off the front VDS. Separate track, large infra win.

---

## Expected per-page request delta

| Page | Today | After T1+T2 |
|---|---|---|
| Video `/video/{slug}` | 5 | **1** |
| Tag/Category (filtered) | 2 + N | **1** |
| Home (filtered) | 2 + N | **1** |
| Actor `/actor/{slug}` | 3 | **1** |

Plus Task 3: most of those remaining single reads are served by the CDN, not the app.

**If only three, in order: Task 1a (video `?include=`), Task 2 (`applied_filters`), Task 3 (HTTP
caching).**
