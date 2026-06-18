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

Impact: `/tag/{slug}`, `/category/{slug}`, `/actor/{slug}` pages show no videos.
These endpoints are the documented contract (FRONTEND_SPEC §4.1–4.2); the frontend
uses them as specified.

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
