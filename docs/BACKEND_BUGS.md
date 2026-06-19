# Backend bug report

Found via the live API + demo data. Frontend is **not** adapted to these — fix on the backend.
All commands run against `http://127.0.0.1:8000/api/v1`.

---

## 1. Untranslated content returns `null` title/slug instead of falling back (high)

After `DEFAULT_LANGUAGE = "en"` / `SUPPORTED_LANGUAGES = (ru, en, es, fr, de, zh)`, requesting a
language the content isn't translated into returns **null fields** rather than falling back to an
available language. The demo content exists only in `ru`:

```bash
curl -s ".../videos/?page_size=1&lang=ru"   # title: "Video 2519", slug: "..."
curl -s ".../videos/?page_size=1&lang=en"   # title: null, slug: null   ✗
curl -s ".../videos/?page_size=1&lang=es"   # title: null               ✗
```

Two problems:

1. **`slug` must never be `null`.** Public pages are addressed by slug (`/video/{slug}`,
   `/tag/{slug}`, …); a null slug is unroutable. Every entity must always return a usable slug
   (fall back to the default-language slug if there's no translated one).
2. **Missing translations should fall back to an available language** (you already model
   `fallback_language`). Returning `null` title/description makes localized listings look empty.

Impact on the frontend: list responses validate `title`/`slug` as required strings, so rows with
null values are dropped → the catalog/feed is **empty** in any language other than `ru` until the
content is translated. With the backend default now `en`, a user with no `ru` language preference
can land on an empty site.

Fix: for any requested supported language, serve translated fields when present and otherwise fall
back (to `fallback_language` or `DEFAULT_LANGUAGE`); never emit a `null` slug.

> Frontend note: `?lang` switching now works (UI for en/ru, content via the API `lang` param), so
> as soon as content is translated (or falls back), other languages will populate automatically.
