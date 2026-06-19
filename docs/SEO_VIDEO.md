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
| **`og:video`** | ❌ **missing** | URL of an **embeddable player** (iframe page) or a direct video file |
| `og:video:type` | ❌ | e.g. `text/html` (player) or `video/mp4` (file) |
| `og:video:width` / `og:video:height` | ❌ | player/file dimensions |
| `video:duration` | ❌ | length in **seconds** (we have `detail.duration`) |
| `ya:ovs:upload_date` | ❌ | ISO 8601 (`detail.published_at`) |
| `ya:ovs:adult` | ❌ | `true` — **required for an adult tube site** |
| `og:restrictions:age` | ❌ | `18+` |

### Recommended next step: an embed route for `og:video`

`og:video` must point to a player Yandex can embed in an iframe (or a direct file).
The watch page itself is not embeddable. Create a minimal player route, e.g.
`src/app/embed/[slug]/page.tsx`, that renders only `<VideoPlayer>` (the data — `hls`,
`poster`, `uuid` — is already on `getVideoDetail`). Then extend the video page's
`generateMetadata` to emit:

```ts
openGraph: {
  type: "video.other",
  videos: [{ url: `${SITE_URL}/embed/${slug}`, type: "text/html", width: 1280, height: 720 }],
},
other: {
  "video:duration": String(Math.round(detail.duration)),
  "ya:ovs:upload_date": detail.published_at,
  "ya:ovs:adult": "true",
  "og:restrictions:age": "18+",
},
```

Embed-route caveats:
- Allow framing: do **not** send `X-Frame-Options: DENY`; scope CSP `frame-ancestors`
  to Yandex/your domains.
- Strip the site chrome (header/footer) and heavy ad layer from the embed.
- Honour the same `noindex` rules; the embed page itself should be `noindex`.

After deploying, submit the site in **Yandex Webmaster → Видео** and use its OG
validator to confirm the markup is accepted.

## Validation tools

- Google: <https://search.google.com/test/rich-results>
- Yandex: Webmaster → Инструменты → валидатор микроразметки; Webmaster → Видео
- OpenGraph: <https://www.opengraph.xyz/>
