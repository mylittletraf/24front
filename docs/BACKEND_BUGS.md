# Backend bug report

Found via the live API + demo data. Frontend is **not** adapted to these — fix on the backend.
All commands run against `http://127.0.0.1:8000/api/v1`.

---

## 1. Detail endpoints 404 in a language the content isn't translated into (high)

The **list** endpoints now fall back for untranslated languages (good — they return the entity
with a usable slug), but the **detail** endpoints don't apply the same fallback and **404**. The
demo content exists only in `ru`:

```bash
# list in en returns this slug…
curl -s ".../videos/?page_size=1&lang=en"        # → slug: "video-2519"

# …but the detail 404s in en / default, and only resolves in the source language:
curl -s -o /dev/null -w "%{http_code}\n" ".../videos/video-2519/?lang=ru"   # 200
curl -s -o /dev/null -w "%{http_code}\n" ".../videos/video-2519/?lang=en"   # 404 ✗
curl -s -o /dev/null -w "%{http_code}\n" ".../videos/video-2519/"           # 404 ✗ (default = en)
```

Impact: a card shown in en links to `/video/video-2519`; the frontend fetches
`/videos/video-2519/?lang=en` → **404** → not-found. So **every card click 404s** in en (the new
default) or any non-source language, even though the listing showed the item.

Fix: detail endpoints must resolve the slug and fall back to an available language
(`fallback_language` / `DEFAULT_LANGUAGE`) exactly like the list endpoints — i.e. any slug returned
by a list in language X must be openable in language X. Likely affects `/tags/{slug}/`,
`/categories/{slug}/`, `/actors/{slug}/`, `/collections/{slug}/` too.

> Frontend note: `?lang` switching works (UI for en/ru, content via the API `lang` param). Once
> detail endpoints fall back like lists, navigation in all languages works without frontend changes.
