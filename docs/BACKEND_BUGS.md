# Backend bug report (found via demo data)

Frontend was **not** adapted to these — they should be fixed on the backend.
All commands below run against `http://127.0.0.1:8000/api/v1`.

---

## 1. Entity "videos" sub-endpoints return empty (high)

`/tags/{slug}/videos/`, `/categories/{slug}/videos/`, `/actors/{slug}/videos/` return
`count: 0` / empty `results`, even when the entity clearly has videos. The catalog
filter on `/videos/` returns them correctly.

Reproduce (category `nauka`, whose detail reports `videos_count: 30`):

```bash
curl -s ".../categories/nauka/videos/?lang=ru"      # -> {"count":0,...,"results":[]}
curl -s ".../categories/nauka/?lang=ru"             # -> videos_count: 30
curl -s ".../videos/?categories=nauka&lang=ru"      # -> 24 results  ✅ works
```

Same for tags and actors:

```bash
curl -s ".../tags/{slug}/videos/?lang=ru"           # -> 0
curl -s ".../actors/{slug}/videos/?lang=ru"         # -> 0
curl -s ".../videos/?actors={slug}&lang=ru"         # -> 24 results  ✅ works
```

Impact: `/tag/{slug}`, `/category/{slug}`, `/actor/{slug}` pages show no videos via
these endpoints. They are the documented contract (FRONTEND_SPEC §4.1–4.2).

Update: because in-page refine (FRONTEND_SPEC §10.2) is defined via
`GET /videos/?categories=…&include_tags=…`, the tag/category pages now build their
listing from that working catalog filter (entity slug as the base filter), and the
actor page from `/videos/?actors=…`. The dedicated `/{entity}/{slug}/videos/`
endpoints are therefore currently unused by the frontend and should be fixed or
formally deprecated in favor of the catalog filter.

---

## 2. CORS headers missing on cached responses, in the browser (high)

In the browser, cross-origin GETs are blocked with
`No 'Access-Control-Allow-Origin' header is present` for:

- `/videos/?cursor=…` (cursor pagination → breaks "Load more" / infinite scroll)
- `/videos/{uuid}/comments/?sort=top`
- `/videos/{uuid}/vast/?placement=…`

Yet the **first** `/videos/` request and `/me/` work, and `curl` with an `Origin`
header returns `access-control-allow-origin` for *all* of them. So the header is
present sometimes and absent other times for the same URL.

Most likely cause: responses are cached (Redis, per the documented 5–10 min TTLs)
**without** the CORS header — e.g. a cache entry first populated by a server-side
request (no `Origin`) is later served to the browser without `Access-Control-Allow-Origin`,
because the CORS middleware runs above/before the cache, or the cache key doesn't
`Vary` on `Origin`.

Suggested fix: ensure the CORS middleware runs *below* the cache (so headers are added
on cache hits), or include `Origin` in the cache key, or add the CORS headers before
the response is cached.

> Frontend note: the app routes browser reads through a same-origin BFF proxy, so it
> is unblocked today — but the backend CORS should still be fixed for correctness.

---

## 3. Malformed tag row in `/tags/` (medium)

`/tags/?page_size=300` contains one item with `name: null` and `slug: null` (all 353
otherwise valid). A null-slug tag is unlinkable and breaks strict consumers.

```bash
curl -s ".../tags/?page_size=300" | python3 - <<'PY'
import sys,json
for t in json.load(sys.stdin)["results"]:
    if t.get("slug") is None or t.get("name") is None: print(t)
PY
```

Impact: a strict client parsing the list as a whole would drop the entire response.
(The frontend now parses leniently and skips invalid rows, but the data should be cleaned.)

---

## 4. No per-video "is_favorited" / "my_reaction" flag (medium, feature request)

To show whether the current user has already favorited (or liked/disliked) a video, the
frontend needs per-user state. Today the only source is paging the entire `/me/favorites/`
list — which the frontend now does on login and caches client-side, but that doesn't scale
to large favorite lists and can't cheaply annotate arbitrary cards.

Neither the video card nor `/videos/{slug}/` returns `is_favorited` / `my_reaction`, even
when called with `Authorization`:

```bash
curl -s -H "Authorization: Bearer <token>" ".../videos/{slug}/?lang=ru"   # no favorite/reaction field
curl -s -H "Authorization: Bearer <token>" ".../videos/?page_size=1"      # no is_favorited on cards
```

Public list/detail responses are cached anonymously, so adding per-user fields there would
fight the cache. Suggested options (pick one):

- A small batch endpoint, e.g. `POST /me/videos/state { "uuids": [...] }` →
  `{ "<uuid>": { "favorited": true, "reaction": "like" | "dislike" | null }, ... }`.
  Cheap, per-user, uncached — lets the frontend annotate exactly the cards on screen.
- Or include `is_favorited` / `my_reaction` on `/videos/{slug}/` (detail) and on `/me/*`
  feeds when the request is authenticated.

This also affects like/dislike state (currently the UI starts "neutral" after reload since
the user's existing reaction isn't returned).

---

## 5. Category/tag with videos missing from list + stale `videos_count` (medium)

A newly populated category `cat-1` is inconsistent across endpoints:

```bash
curl -s ".../categories/cat-1/?lang=ru"                      # videos_count: 0
curl -s ".../videos/related-filters/?categories=cat-1"       # total_videos: 1
curl -s ".../categories/?page_size=100"                      # cat-1 NOT in the list (count 31)
```

So the category has at least one video (`/videos/?categories=cat-1` returns it), but its
detail reports `videos_count: 0` and it is omitted from `/categories/`. Likely the list
filters out categories whose (stale) `videos_count` is 0, and the per-entity count isn't
recomputed when videos are assigned.

Impact: newly filled categories/tags don't appear in the header strip or `/categories`
until counts are recalculated. (Their refine block is also empty because a 1-video
category has no co-occurring tags with `intersection_count ≥ 2` — that part is expected.)

---

## 6. Actor-attribute tags leak into a video's `tags` and 404 when opened (high)

`GET /videos/{slug}/` returns a `tags: [{uuid,name,slug}]` array that mixes content tags
**and actor-attribute tags** (country, body type, bra size, breast type, hair color, eye
color). Example: video `33w535w5` has 59 `tags` including `rossiya`, `ssha`, `stroynaya`,
`75a`, `blondinka`, `golubye`, … . The items carry **no `is_*` flags and no `type`**, so the
frontend cannot tell content tags from attribute tags.

Those attribute slugs have no tag page — `/tags/{slug}/` returns **404** (and `/categories/{slug}/`
too):

```bash
curl -s -o /dev/null -w "%{http_code}\n" ".../tags/rossiya/?lang=ru"   # 404
curl -s -o /dev/null -w "%{http_code}\n" ".../tags/75a/?lang=ru"       # 404
```

So rendering them as `/tag/{slug}` chips (the documented behavior for `tags`) leads to a 404
when clicked. The `/tags/` list endpoint **excludes** attribute tags, so the frontend can't
even build an allow-list to filter them out from the detail payload.

Per FRONTEND_SPEC §0.1/§4.1 the `is_*` flags exist "для различения атрибутов актёра от
контент-тегов при отображении" — but they're absent from video-detail `tags`.

Fix (pick one):
- exclude actor-attribute tags from the video `tags` array (keep them only on the actor), or
- include `is_*` flags (or a `type: "tag" | "country" | "body_type" | …`) on each item in
  the detail `tags` so the frontend can skip/route them (e.g. attributes → `/actors?country=…`).

Frontend was **not** adapted — attribute-tag chips currently 404 on click until this is fixed.

(Related: `/tags/?page_size=300` returns only 200 items though `count` is 302 — page size
seems capped at 200; large pulls are truncated.)

---

## 7. No source to populate the actor attribute filters (high)

The actors filter (FRONTEND_SPEC §8.1) needs the list of values for: country, body type,
bra size, breast type, hair color, eye color. The spec says to read them from
`GET /tags/?page_size=200` filtered by the `is_country` / `is_body_type` / … flags.

That no longer works:

```bash
curl -s ".../tags/?page_size=100" | …   # all 302 tags have is_country=false, is_body_type=false, …
curl -s ".../tags/?is_country=true"     # ignored — still returns all 302
curl -s -o /dev/null -w "%{http_code}" ".../attributes/"        # 404
curl -s -o /dev/null -w "%{http_code}" ".../actor-attributes/"  # 404
```

Attribute tags are now excluded from `/tags/` (good — that's the §6 leak), but **nothing
replaced them** as the source of attribute values, so the actor attribute dropdowns are empty.
The values clearly exist — every actor carries them as `{uuid,name,slug}`
(`country`, `body_type`, `bra_size`, `boobs_type`, `hair_color`, `eye_color`).

Fix (pick one):
- make the flag filters work, e.g. `GET /tags/?is_country=true` returns the country tags, or
- add an endpoint, e.g. `GET /actor-attributes/` →
  `{ "country": [{uuid,name,slug}], "body_type": [...], "bra_size": [...], "boobs_type": [...], "hair_color": [...], "eye_color": [...] }`.

Frontend was **not** adapted — the attribute dropdowns stay empty until a source is provided.
(Gender / country-by-actor-filter still work where applicable.)
