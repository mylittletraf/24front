# SEO — backend data improvements

> **Status 2026-06-21 — DELIVERED.** The backend shipped the full field set (ratings, `is_indexable`,
> actor `wikidata_id`/`external_links`, `date_modified`, `faq`, `thumbnails[]`, `studios`, localized
> `aliases`, `og_image`) plus the video/image/tags/actors/collections sitemaps, and fixed the
> cross-language fallback bug. The frontend now consumes all of it (AggregateRating, FAQPage on
> video/tag/category, Person `sameAs`/`birthPlace`/`worksFor`, `dateModified`, `productionCompany`,
> multi-aspect thumbnails, `is_indexable` → robots via the `/seo` endpoint).
> **Still open:** VTT captions/transcript (backend skipped); a full **studios** frontend feature
> (`/studios` list + `/studio/[slug]` + `studios` catalog filter + visible studio chips) — studios
> are currently used only in JSON-LD (`productionCompany`/`worksFor`).
>
> The historical request list is kept below for reference.

---

Data the **frontend already builds markup for** but the backend doesn't yet provide (or provides
inconsistently). The frontend is the source of truth for structured data (JSON-LD); see
`src/lib/seo/structured-data.ts`. Each item below lists the field, where it lives, and what SEO
feature it unlocks once the data exists.

> Out of scope here (tracked separately): the cross-language detail **fallback bug**
> (`docs/BACKEND_BUGS.md`) — detail endpoints 404 in untranslated languages, which breaks the
> hreflang `alternates` the frontend emits.
>
> Dropped after review: progressive **mp4 `contentUrl`** (kept HLS to save storage — only the mp4
> trailer exists; fine) and **category `parent` hierarchy** (low SEO ROI vs. the filter rework;
> siloing is already covered by related-tags/categories links).

---

## 🔴 Tier 1 — highest impact

### 1. Genuine ratings → `AggregateRating` (star rich snippet, big CTR win)
Stars in the SERP are the single biggest CTR lever for a tube site. Must be **real** ratings —
Google penalizes fabricated ones, so a raw like/dislike count can't be passed through as
`ratingValue` (the backend may *compute* a 1–5 value from genuine votes and expose it with the
count of voters).

| Field | Entity | Type | Unlocks |
| --- | --- | --- | --- |
| `rating_value` | video, actor | float (e.g. 1–5) | `AggregateRating.ratingValue` |
| `rating_count` | video, actor | int (number of voters) | `AggregateRating.ratingCount` |
| `best_rating` / `worst_rating` | optional | int | rating scale bounds |

### 2. `is_indexable` + thin-page threshold for tags / actors / categories
Auto-generated taxonomy pages with 0–1 videos cause index bloat and drag down sitewide quality.
The frontend will set `robots: noindex,follow` when a page is flagged non-indexable.

| Field | Entity | Type | Unlocks |
| --- | --- | --- | --- |
| `is_indexable` | tag, category, actor (video already has it) | bool | `noindex,follow` on thin pages |

Suggested rule: `is_indexable = videos_count >= N` (e.g. N=3), overridable per record.

### 3. Actor external IDs → `Person.sameAs` (Knowledge Panel, entity SEO)
Strongest entity-understanding/disambiguation signal; enables a Knowledge Panel.

| Field | Type | Unlocks |
| --- | --- | --- |
| `wikidata_id` | string (`Q…`) | `Person.sameAs` |
| `external_links` | string[] (IMDb, Instagram, X, official site) | `Person.sameAs[]` |

### 4. Video + Image sitemaps (backend owns sitemap; frontend proxies it)
Direct traffic from Google/Yandex Video and Google/Yandex Images.

- **Video sitemap** `<video:video>`: `thumbnail_loc`, `title`, `description`, **`player_loc` =
  `/embed/<slug>`** (HLS-only is fine — no `content_loc` needed), `duration`, `publication_date`,
  `family_friendly=no`, `view_count`, `tag`, `rating`.
- **Image sitemap** `<image:image>`: poster + screenshots + actor photos, with localized
  `<image:title>` (see the earlier image-sitemap ticket).
- Requires `date_modified` (Tier 2) for `<lastmod>`.
- Ensure the HLS manifest is **publicly fetchable (no auth) with CORS**, or crawlers can't verify
  the video.

---

## 🟠 Tier 2 — meaningful impact

### 5. `date_modified` on all detail endpoints
| Field | Entity | Unlocks |
| --- | --- | --- |
| `date_modified` / `updated_at` | video, actor, tag, category, collection | `dateModified` (freshness) + sitemap `<lastmod>` |

### 6. Multi-aspect thumbnails for video
| Field | Entity | Unlocks |
| --- | --- | --- |
| thumbnail set 16:9 / 4:3 / 1:1 | video | `VideoObject.thumbnailUrl[]` (Google recommendation) |

### 7. Editorial unique text + FAQ for categories / tags
`CollectionPage` ranks for head terms only with unique descriptive copy; `description` is often
empty/short today.

| Field | Entity | Unlocks |
| --- | --- | --- |
| `seo_text` / long `description` (HTML) | tag, category | content block + text relevance |
| `faq` (array of `{question, answer}`) | category, tag, (video) | `FAQPage` (frontend already renders the accordion for actors) |

### 8. Tag `aliases` — ✅ delivered
The backend returns localized `aliases` per language, and the frontend renders them as
`CollectionPage.alternateName` + a visible "also known as" line. Nothing left to do.

---

## 🟡 Tier 3 — nice to have

| Field | Entity | Unlocks |
| --- | --- | --- |
| `birth_place` (city/country) | actor | `Person.birthPlace` (more precise than `nationality`) |
| `career_start_year` / active years | actor | bio/FAQ depth, extra `Person` props |
| `studio` / `agency` | actor, video | `worksFor` / `productionCompany` |
| longer unique `bio` | actor | content depth, E-E-A-T |
| `captions` / `transcript` (VTT) | video | accessibility + potential key-moments |
| dedicated `og_image` | tag, category, actor | correct social/Yandex OG (we fall back to preview/photo today) |
| `screens` always `[]` (never `null`) | video | cleaner contract (frontend already tolerates null) |

---

## Top 5 if short on time
1. `rating_value` + `rating_count` (video & actor) → star snippets.
2. `is_indexable` for tags/actors/categories → kill thin pages, protect crawl budget.
3. Actor `sameAs` (wikidata / socials) → Knowledge Panel & entity SEO.
4. Video + Image sitemaps + `date_modified` → Video/Images traffic.
5. Unique SEO text + FAQ for categories/tags → rank head terms.

All of the above are cheap on the frontend — the markup is already generated; only the data is
missing.
