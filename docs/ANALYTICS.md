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

### Wired events (full list)

All of these already fire `track(...)`. The **Event** column is the exact identifier —
use it verbatim when creating goals/conversions below.

| Event | Fires when | Params | Source |
| --- | --- | --- | --- |
| `video_play` | first play of a video | `video_uuid`, `embed` | `player.tsx` |
| `video_progress_25` | 25% of the video watched | `video_uuid` | `player.tsx` |
| `video_progress_50` | 50% watched | `video_uuid` | `player.tsx` |
| `video_progress_75` | 75% watched | `video_uuid` | `player.tsx` |
| `video_complete` | playback reached the end | `video_uuid` | `player.tsx` |
| `embed_play` | first play **inside the Yandex Video embed** | `video_uuid` | `player.tsx` |
| `video_reaction` | like / dislike clicked | `type`, `video_uuid`, `guest?` | `video-actions.tsx` |
| `video_favorite` | save/favorite toggled | `video_uuid`, `active` | `video-actions.tsx` |
| `search` | search submitted | `query` | `search-box.tsx` |
| `taxonomy_click` | category/actor/tag/attribute chip clicked | `kind`, `href` | `track-taxonomy.tsx` |
| `feed_open` | feed nav link clicked | — | `header.tsx` |
| `report_submit` | a report/complaint was sent | `video_uuid`, `topic` | `report-modal.tsx` |
| `login` | successful login | — | `login-form.tsx` |
| `register` | successful registration | — | `register-form.tsx` |
| `ad_impression` | a VAST ad started | `format`, `placement` | `player.tsx` |
| `ad_click` | VAST ad click-through (best-effort) | `format`, `placement` | `player.tsx` |
| `ad_clickunder` | clickunder/popunder fired | `slot` | `player.tsx` |
| `ad_slot_render` | HTML/JS slot rendered (catfish, in_page, native) | `slot` | `ad-slot-render.tsx` |

Funnels you get for free:
- **Content retention:** `video_play → video_progress_25 → _50 → _75 → video_complete`.
- **Ad performance:** `ad_slot_render` (fill) + `ad_impression` + `ad_click` (CTR).
- **Yandex Video traffic:** `embed_play` vs `video_play` (the latter also carries `embed:true/false`).

> `placement` on `ad_impression`/`ad_click` distinguishes on-site (`pre_roll`/`post_roll`)
> from the Yandex embed (`ya_vast_preroll`/`ya_vast_postroll`).

### Where to create what (setup checklist)

**Yandex.Metrica** — Настройки счётчика → **Цели** → «Добавить цель» → тип **«JavaScript-событие»**,
and paste the identifier into the *Идентификатор цели* field. Create one goal per event you
care about (recommended set):

```
video_play   video_complete   embed_play
video_reaction   video_favorite   search   taxonomy_click   feed_open
register   login   report_submit
ad_impression   ad_click   ad_clickunder   ad_slot_render
```

(Optionally also `video_progress_25/50/75` if you want the quartile funnel as goals.)

**Google Analytics 4** — events arrive automatically (Admin → Events, within ~24h, no setup).
Then Admin → **Key events / Conversions** → mark the ones that matter as conversions, e.g.:

```
register   login   video_play   embed_play   ad_click
```

GA4 event **params** (`video_uuid`, `type`, `query`, `placement`, …) are also sent; to filter
or report on a param value in GA4, register it once as a **custom dimension**
(Admin → Custom definitions). Metrica receives the same params as goal parameters.

### Adding a new event later

1. `track("my_event", { ...params })` at the call site (any client component).
2. GA4: appears under Events within ~24h; mark as conversion if needed.
3. Metrica: create goal «JavaScript-событие» with identifier `my_event`.

## Notes

- `NEXT_PUBLIC_*` vars are inlined at **build time** — rebuild/redeploy after changing them.
- Verification tags live in the root layout, so they appear on every page (Google/Yandex
  fetch the homepage to verify).
- The embed player (`/embed/*`) **does** load the counters (chrome/ad overlays are stripped,
  analytics is not), so Yandex Video playback is measured. Use `embed_play` (or the `embed`
  param on `video_play`) to separate that traffic. If you'd rather keep embed stats in a
  **separate** Metrica counter, add a second `NEXT_PUBLIC_YM_ID_EMBED` and branch in
  `Analytics`/`track` by pathname.
