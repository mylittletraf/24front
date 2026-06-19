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

## Notes

- `NEXT_PUBLIC_*` vars are inlined at **build time** — rebuild/redeploy after changing them.
- Verification tags live in the root layout, so they appear on every page (Google/Yandex
  fetch the homepage to verify).
