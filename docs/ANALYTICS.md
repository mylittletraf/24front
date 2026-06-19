# Analytics & site verification (Google / Yandex)

Everything is wired in code and driven by env vars — paste the IDs/tokens into `.env`
(see `.env.example`) and redeploy. Empty var = nothing rendered. The Yandex Video embed
(`/embed/*`) deliberately renders **no** counters.

## 1. Yandex.Metrica (счётчик)

1. <https://metrika.yandex.ru> → создать счётчик для домена → скопировать **номер** счётчика.
2. `NEXT_PUBLIC_YM_ID=99999999`

The counter script + `<noscript>` pixel are injected by `src/components/analytics.tsx`
(clickmap, trackLinks, accurateTrackBounce enabled).

## 2. Google Analytics 4

1. <https://analytics.google.com> → Admin → Data stream → **Measurement ID** (`G-XXXXXXX`).
2. `NEXT_PUBLIC_GA_ID=G-XXXXXXX`

(Optional) Plausible: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=example.com`.

## 3. Yandex Webmaster (вебмастер)

1. <https://webmaster.yandex.ru> → добавить сайт.
2. Способ подтверждения → **Мета-тег**. Yandex shows
   `<meta name="yandex-verification" content="abc123" />` — copy only `abc123`.
3. `NEXT_PUBLIC_YANDEX_VERIFICATION=abc123` (rendered site-wide via `src/app/layout.tsx`).
4. Redeploy, then press **Проверить**.
5. After verification:
   - **Индексирование → Файлы Sitemap**: add `https://<домен>/sitemap.xml`
     (already proxied from the backend via `next.config.ts`).
   - **Видео**: confirm video pages are picked up — needs the `og:video` + `VideoObject`
     markup (see `SEO_VIDEO.md`).

## 4. Google Search Console (консоль)

1. <https://search.google.com/search-console> → Add property → **URL prefix** = your domain.
2. Verification method → **HTML tag**. Google shows
   `<meta name="google-site-verification" content="xyz789" />` — copy only `xyz789`.
3. `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xyz789`
4. Redeploy → **Verify**.
5. Then **Sitemaps** → submit `https://<домен>/sitemap.xml`.

> Alternative verification (no redeploy): both services also support a DNS TXT record,
> which verifies the whole domain at once and is handy if you can't ship env changes.

## 5. Custom events / goals (метки/триггеры)

One helper sends an event to **both** GA4 and Metrica — `src/lib/analytics/track.ts`:

```ts
import { track } from "@/lib/analytics/track";

track("video_play", { video_uuid: uuid });
track("ad_impression", { format: "vast", placement: "ya_vast_preroll" });
```

`track(name, params?)` is a no-op on the server / when a provider isn't configured, so call
it freely from any client component. It dispatches:
- **GA4** → `gtag('event', name, params)` — appears automatically; mark the important ones
  as **conversions** in GA4 → Admin → Events.
- **Metrica** → `ym(id, 'reachGoal', name, params)` — only shows up if you create a matching
  **goal** of type «JavaScript-событие» with the **same identifier** in the Metrica dashboard
  (Настройки → Цели). So: pick a name here, create the goal with that name there.

Keep names `snake_case` and stable — they're the report keys in both tools.

### Already wired

| Event | Where | Params |
| --- | --- | --- |
| `video_play` | first play of a video (`player.tsx`) | `video_uuid` |
| `video_complete` | playback reached the end (`player.tsx`) | `video_uuid` |
| `ad_impression` | a VAST ad actually started (`player.tsx`) | `format`, `placement` |
| `ad_clickunder` | clickunder/popunder fired (`player.tsx`) | `slot` |
| `ad_slot_render` | an HTML/JS slot rendered — catfish, in_page, native (`ad-slot-render.tsx`) | `slot` |

That already covers **просмотры** and **активации рекламных слотов** across every format
(VAST, overlay slots, clickunder).

### Recommended additional events

Drop a `track(...)` call at the relevant interaction; high-value candidates:

| Event | Where to add | Why |
| --- | --- | --- |
| `search` | search submit (`components/layout/search-box.tsx`) | what users look for; `{ query }` |
| `video_reaction` | like/dislike (`components/video/video-actions.tsx`) | engagement; `{ type }` |
| `video_favorite` | save/favorite (`video-actions.tsx`) | engagement |
| `register` / `login` | auth flow | conversion funnel |
| `report_submit` | `components/video/report-modal.tsx` | moderation signal |
| `taxonomy_click` | category/tag/actor chips (`meta-row.tsx`) | navigation interest |
| `feed_open` | feed nav (`header.tsx`) | feature usage |
| `embed_play` | embed player — pass a flag through `VideoPlayer` | Yandex Video traffic vs on-site |
| `video_progress_25/50/75` | extend the player progress timer | drop-off / completion funnel |
| `ad_click` | if a network exposes a click callback | CTR alongside `ad_impression` |

For ad performance, the pair **`ad_slot_render` / `ad_impression` + `ad_click`** gives you
fill-rate and CTR. For content, **`video_play` → `video_progress_*` → `video_complete`**
gives a retention funnel.

### Adding a new one

1. `track("my_event", { ...params })` at the call site (client component).
2. GA4: it appears under Events within ~24h; mark as conversion if needed.
3. Metrica: create goal «JavaScript-событие» with identifier `my_event`.

## Notes

- `NEXT_PUBLIC_*` vars are inlined at **build time** — rebuild/redeploy after changing them.
- Verification tags live in the root layout, so they appear on every page (Google/Yandex
  fetch the homepage to verify).
- The embed player (`/embed/*`) loads no analytics scripts, so its `track()` calls are
  no-ops there — add an explicit counter to the embed layout if you want Yandex-traffic stats.
