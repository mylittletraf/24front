# Video SEO & structured data (Google / Yandex)

How rich video markup is wired, and what's still needed for **Yandex Video** indexing.

## What's already in place

| Signal | Where | Notes |
| --- | --- | --- |
| **schema.org `VideoObject` (JSON-LD)** | `src/components/seo/json-ld.tsx`, fed by `seo.json_ld` from the backend `/seo/video/{slug}/` | Rendered on every video page. **Backend-generated** — the frontend only prints it. |
| **Canonical, hreflang, robots** | `seoToMetadata` in `src/lib/api/seo.ts` | `<link rel=canonical>`, `<link rel=alternate hreflang>`, `<meta name=robots>`. Backend may send `noindex,follow` for thin/fallback pages — passed through as-is. |
| **OpenGraph + Twitter** | `seoToMetadata` | `og:title/description/image/url`, `og:site_name` (from `SITE_NAME`), Twitter `summary_large_image`. |
| **`og:type = video.other`** | `src/app/video/[slug]/page.tsx` → `seoToMetadata(seo, "video.other")` | Classifies the watch page as a video, not a website. |
| **Sitemaps + robots.txt** | `next.config.ts` rewrites → backend | `/sitemap.xml`, `/sitemap-videos.xml`, …, `/robots.txt` proxied through the front domain. |

### Validate the backend `VideoObject`

Since the JSON-LD is produced by the backend, confirm it contains the fields Google
uses for the video rich result. Paste a live video URL into the
[Google Rich Results Test](https://search.google.com/test/rich-results) and check for:

- `name`, `description`, `thumbnailUrl` (≥ 1, ideally 16:9), `uploadDate`
- `duration` (ISO 8601, e.g. `PT9M30S`)
- `contentUrl` and/or `embedUrl`
- `actor` (array of `Person`) — the "участники" / cast
- `interactionStatistic` (view count), `genre`/`keywords` (categories/tags)

If any are missing, fix them in the **backend** `/seo` serializer — the frontend renders
whatever it receives.

## What's still needed for Yandex Video

Yandex indexes video from **OpenGraph** and/or **schema.org `VideoObject`**, plus the
video sitemap. We have VideoObject + sitemap, but the OpenGraph **player** markup is
missing. Yandex's primary signals
([docs](https://yandex.ru/support/webmaster/ru/video/open-graph)):

| Tag | Status | Value |
| --- | --- | --- |
| `og:type` | ✅ done | `video.other` |
| `og:title`, `og:url`, `og:image`, `og:description` | ✅ done | via `seoToMetadata` (image ≥ 352×198) |
| **`og:video`** + `og:video:type/width/height` | ✅ done | points to the embed player (`/embed/[slug]`, `text/html`, 1280×720) — see `generateMetadata` in `src/app/video/[slug]/page.tsx` |
| `video:duration` | ❌ | length in **seconds** (`detail.duration`) |
| `ya:ovs:upload_date` | ❌ | ISO 8601 (`detail.published_at`) |
| `ya:ovs:adult` | ❌ | `true` — **recommended for an adult tube site** |
| `og:restrictions:age` | ❌ | `18+` |

> The remaining ❌ tags are `property=`-style Yandex/OG tags that Next's `metadata.other`
> emits as `name=`. If Yandex's validator wants them, render them as raw `<meta property>`
> tags (e.g. a small server component in the video page `<head>` via the metadata API is
> insufficient — use a dedicated `<meta>` injection). Lower priority than `og:video`.

### Embed route (done)

`src/app/embed/[slug]/page.tsx` renders only `<VideoPlayer>`. The root layout
(`src/app/layout.tsx`) strips site chrome / ad overlays / analytics for any `/embed`
path (detected via the `x-pathname` header set in `src/middleware.ts`), and the page is
`noindex`. Framing is allowed (no `X-Frame-Options` is set). The watch page's `og:video`
points here.

#### VAST ads in the embed (Yandex-only, independently toggleable)

The embed player requests **separate** VAST placements so they never mix with the
on-site pre/post-roll:

- `ya_vast_preroll`, `ya_vast_postroll` (see `AdPlacement` in `src/lib/api/video-actions.ts`).
- The embed passes `vastPlacements={{ pre: "ya_vast_preroll", post: "ya_vast_postroll" }}`
  and `clickunderSlot=""` (no on-site clickunder) to `<VideoPlayer>`.

**Backend setup:** define VAST tags for these two placements at
`GET /videos/{uuid}/vast/?placement=ya_vast_preroll|ya_vast_postroll`. Each is toggled
independently — answer **204** to disable just that one (player shows no ad, playback
unaffected). The on-site `pre_roll`/`post_roll` are unchanged.

After deploying, submit the site in **Yandex Webmaster → Видео** and use its OG
validator to confirm the markup is accepted.

## Validation tools

- Google: <https://search.google.com/test/rich-results>
- Yandex: Webmaster → Инструменты → валидатор микроразметки; Webmaster → Видео
- OpenGraph: <https://www.opengraph.xyz/>
