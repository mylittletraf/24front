# ТЗ фронтенда — публичный API

Фронтенд — отдельное SPA/SSR-приложение (рекомендуется **Next.js**). Бэкенд — самостоятельный REST-сервис
(Django + DRF), реализован полностью. Этот документ описывает **полный актуальный API-контракт**.

Интерактивная спека: `GET /api/v1/schema/` (OpenAPI), Swagger `/api/v1/docs/`, ReDoc `/api/v1/redoc/`.
Теги операций: `public`, `user-actions`, `content`, `internal`.

---

## 0. Базовое

- **Base URL:** `https://<api-host>/api/v1/` (dev — `http://localhost:8000/api/v1/`).
- **Формат:** JSON, UTF-8. Версионирование — `/api/v1/`.
- **SSR/SSG** — для публичных страниц (каталог, видео, теги, актёры, коллекции) ради SEO. Личный кабинет и
  пользовательские действия — CSR.

### 0.1 Ключевые конвенции

| Правило | Описание |
|---|---|
| **read-by-slug** | Публичные GET-страницы адресуются по **переводному `slug`**: `/videos/{slug}/`, `/tags/{slug}/`, `/actors/{slug}/`, `/collections/{slug}/`. |
| **action-by-uuid** | Мутации адресуются по **`uuid`**: `/videos/{uuid}/view\|reaction\|favorite\|…`, `/comments/{uuid}/…`. Sequential id не использовать. |
| **`?lang`** | Язык контента: `?lang=ru\|en`. Если не передан — резолвится по `Accept-Language`, затем `DEFAULT_LANGUAGE=ru`. |
| **fallback** | Если перевода нет — приходит перевод на `ru` + `language` (запрошенный) и `fallback_language` (фактический). `<html lang>` ставить по `fallback_language ?? language`. |
| **anti-leak** | Неопубликованный/скрытый объект для анонима → **404**, не 403. Внутренние id не светятся. |
| **URL изображений** | Все изображения (`photo`, `cover_image`, `preview_image`, `og_image`, `poster`, `screens[]`) — **готовые абсолютные URL** (`https://img-host/…`) или `null`. Не приклеивать origin/`MEDIA_URL`. |

### 0.2 Пагинация

- **Cursor** (ленты видео, комментарии): `{ "next": "<url|null>", "previous": "<url|null>", "results": [...] }`.
  Листать через `next`/`previous` (`?cursor=…&page_size=…` уже зашиты). По умолчанию `page_size=24` (видео),
  `page_size=20` (комментарии); max 100.
- **PageNumber** (актёры, теги/категории, `/me/*`-ленты, `/search/<type>/`):
  `{ "count": N, "next": …, "previous": …, "results": [...] }`. Параметры `?page=2&page_size=50`.

### 0.3 Ошибки

| Статус | Формат |
|---|---|
| 400 | `{ "<field>": ["…"] }` или `{ "detail": "…" }` |
| 401 | `{ "detail": "…" }` — нужна авторизация |
| 403 | `{ "detail": "…" }` — только staff |
| 404 | `{ "detail": "Not found." }` |
| 409 | `{ "detail": "…" }` — конфликт (Content API) |
| 429 | `{ "detail": "…" }` — throttle; учитывать `Retry-After` |

---

## 1. Аутентификация (JWT)

JWT HS256: `access` 30 мин, `refresh` 30 дней, **rotation + blacklist** (каждый refresh выдаёт новую пару,
старый инвалидируется). Заголовок: `Authorization: Bearer <access>`.

**Хранение:** `access` — память или httpOnly-cookie через BFF; `refresh` — httpOnly, secure, sameSite.
Не хранить в localStorage. `quick_login_token` показывать пользователю один раз (магическая ссылка).

**Поток 401:** при 401 на защищённом запросе — `POST /auth/refresh/`; при ошибке — разлогинить.

| Метод | Путь | Auth | Запрос | Ответ |
|---|---|---|---|---|
| POST | `/auth/register/` | — | `{username, password, email?, display_name?}` | `201 {user, quick_login_token, access, refresh}` |
| POST | `/auth/login/` | — | `{username, password}` | `200 {access, refresh}` |
| POST | `/auth/refresh/` | — | `{refresh}` | `200 {access, refresh}` (новая пара) |
| POST | `/auth/logout/` | — | `{refresh}` | `205` (refresh → blacklist) |
| POST | `/auth/quick-login/` | — | `{token}` | `200 {access, refresh}` |
| GET | `/me/` | ✔ | — | `200 user` |
| PATCH | `/me/` | ✔ | `{display_name}` | `200 user` |
| DELETE | `/me/` | ✔ | — | `204` (деактивация + анонимизация; контент остаётся) |
| POST | `/me/quick-login-link/` | ✔ | — | `200 {quick_login_token}` |

`user` = `{ id, username, display_name, email, is_verified, created_at }`.

`register` сразу логинит — отдельный login после регистрации не нужен.
Auth-эндпоинты: троттл 5/мин на IP.

**Поток quick-login (магическая ссылка):**
1. `quick_login_token` выдаётся при регистрации (`POST /auth/register/`) и при перевыпуске (`POST /me/quick-login-link/`).
2. Фронт формирует ссылку: `https://{domain}/quick-login?token={quick_login_token}` — показывать в copyable input в настройках профиля, пока пользователь не покинет страницу или не запросит новую. Не сохранять в localStorage. На бэке хранится только SHA-256 хэш, повторно получить тот же токен через API невозможно.
3. Переход по ссылке: страница `/quick-login` считывает `?token=` из URL → `POST /auth/quick-login/ {token}` → получает пару токенов → разлогинивает текущую сессию (если есть) → логинит → `router.replace('/')`.
4. Перевыпуск: кнопка «Обновить ссылку» → `POST /me/quick-login-link/` → старый токен инвалидируется, новый показывается в том же поле. Предупреждение: «Не передавайте ссылку третьим лицам».

---

## 2. Видео

### 2.1 Ленты и каталог (cursor)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/videos/` | Каталог с фильтрами |
| GET | `/videos/trending/` | В тренде |
| GET | `/videos/popular/` | По просмотрам |
| GET | `/videos/new/` | Новинки |
| GET | `/videos/recommended/` | Персонализовано (auth — по истории; аноним — trending) |
| GET | `/videos/{slug}/related/` | Похожие (общие теги) — список без пагинации |
| GET | `/videos/{slug}/next/` | Следующее видео — объект-карточка или `null` |

**Фильтры `/videos/`** (query-параметры):

| Параметр | Тип | Описание |
|---|---|---|
| `lang` | `ru\|en` | Язык контента |
| `include_tags`, `exclude_tags` | slug через запятую | Фильтр по тегам |
| `categories` | slug через запятую | Фильтр по категориям |
| `actors` | slug через запятую | Фильтр по актёрам |
| `q` | строка | Свободный текст (до 100 символов) |
| `duration_min`, `duration_max` | секунды | Диапазон длительности |
| `published_after`, `published_before` | `YYYY-MM-DD` | Диапазон дат |
| `sort` | enum | `newest\|oldest\|popular\|trending\|most_liked\|most_viewed\|duration_short\|duration_long` |

**Карточка видео** (элемент `results` в лентах и каталоге):
```json
{
  "uuid": "ed03078e-…",
  "duration": 600,
  "views_count": 11,
  "likes_count": 2,
  "dislikes_count": 0,
  "comments_count": 1,
  "published_at": "2026-06-17T12:00:00Z",
  "poster": "https://img.example.com/video/1/poster.webp",
  "trailer": "https://v.example.com/video/1/trailer.mp4",
  "title": "Тестовое видео",
  "slug": "testovoe-video",
  "language": "ru"
}
```

- `poster` — основной постер карточки (`null` если не задан).
- `trailer` — URL файла трейлера для автопроигрывания при наведении (`null` если не загружен).

Кеш: список 5 мин, ленты 10 мин.

### 2.2 Страница видео (detail)

`GET /videos/{slug}/?lang=ru`

```json
{
  "uuid": "…",
  "duration": 600,
  "is_indexable": true,
  "published_at": "…",
  "views_count": 11,
  "likes_count": 2,
  "dislikes_count": 0,
  "comments_count": 1,
  "favorites_count": 1,
  "trending_score": 0.0,
  "title": "…",
  "slug": "testovoe-video",
  "description": "…",
  "seo_title": "…",
  "seo_description": "…",
  "seo_h1": "…",
  "language": "ru",
  "fallback_language": null,
  "sources": {
    "mp4": {},
    "hls": "https://v.example.com/video/1/playlist.m3u8",
    "trailer": "https://v.example.com/video/1/trailer.mp4"
  },
  "screens": ["https://img.example.com/video/1/screens/1.webp"],
  "poster": "https://img.example.com/video/1/poster.webp",
  "tags": [{ "uuid": "…", "name": "Тег", "slug": "teg" }],
  "actors": [{ "uuid": "…", "name": "Актриса", "slug": "aktrisa" }],
  "slugs": { "ru": "testovoe-video", "en": "…" }
}
```

- **Плеер:** `sources.hls` — мастер-плейлист ABR (hls.js / Video.js / Safari native); качество переключается
  автоматически. `sources.mp4` всегда пустой (HLS-only). `sources.trailer` — превью/трейлер (`null` если нет).
  `screens` — галерея/scrubbing-превью.
- **`slugs`** — для построения переключателя языка, canonical и hreflang.
- **404 → редирект:** если detail вернул 404, вызвать
  `GET /redirects/?slug={slug}&entity_type=video&lang={lang}`;
  при `{redirect:true, new_slug}` — `router.replace` на новый slug.
- Кеш: 5 мин (ключ slug+lang).

### 2.3 Действия (by uuid)

| Метод | Путь | Auth | Запрос | Ответ | Примечание |
|---|---|---|---|---|---|
| POST | `/videos/{uuid}/view/` | — | — | `{"counted": true\|false}` | Дедуп 24ч по IP+UA; вызывать при старте просмотра |
| POST | `/videos/{uuid}/guest-like/` | — | — | `{"counted": true\|false}` | Анонимный лайк, дедуп 7д по IP; без отзыва |
| POST | `/videos/{uuid}/reaction/` | ✔ | `{"reaction": "like"\|"dislike"}` | `{"reaction": "like"}` | Переключение like↔dislike |
| DELETE | `/videos/{uuid}/reaction/` | ✔ | — | `204` | Снять реакцию |
| POST | `/videos/{uuid}/favorite/` | ✔ | — | `{"favorited": true}` + 201/200 | Идемпотентно |
| DELETE | `/videos/{uuid}/favorite/` | ✔ | — | `204` | |
| POST | `/videos/{uuid}/progress/` | ✔ | `{"watch_progress": 0..1, "last_position_seconds": int}` | `{watch_progress, last_position_seconds}` | Слать с throttle ~раз в 10–30с |

Счётчики eventually consistent (Redis-буфер, flush ~5 мин). Для мгновенного UX — **оптимистичные обновления**
на клиенте, не полагаться на немедленную смену числа в API.

Реклама в плеере — см. §7.

---

## 3. Комментарии

Один уровень, без веток. Новые комментарии — на ручную модерацию (`pending`); в публичном списке видны только
`approved`.

| Метод | Путь | Auth | Запрос | Ответ |
|---|---|---|---|---|
| GET | `/videos/{video_uuid}/comments/?sort=top\|new\|old` | — | — | Cursor-список approved |
| POST | `/videos/{video_uuid}/comments/` | ✔ | `{"text": "…"}` | `201` созданный (status=pending) |
| GET | `/comments/{uuid}/` | — | — | Один approved или `404` |
| DELETE | `/comments/{uuid}/` | ✔ (автор) | — | `204`; чужой → `403` |
| POST | `/comments/{uuid}/like/` | ✔ | — | `{"reaction": "like"}` |
| POST | `/comments/{uuid}/dislike/` | ✔ | — | `{"reaction": "dislike"}` |
| DELETE | `/comments/{uuid}/reaction/` | ✔ | — | `204` |

Элемент: `{ "uuid", "text", "author": "<display_name|null>", "likes_count", "dislikes_count", "created_at" }`.
`author=null` — автор удалил аккаунт.

**UX:** после POST показать «комментарий отправлен на модерацию» (в GET не появится до одобрения).
Throttle: создание 5/мин; лайки 10/30 в мин.

---

## 4. Теги, категории, актёры

### 4.1 Теги и категории

Категория = тег с `is_category=true` (плоская структура без иерархии).

| GET | Назначение |
|---|---|
| `/tags/` , `/categories/` | Список (PageNumber, кеш 1ч) |
| `/tags/{slug}/` , `/categories/{slug}/` | Detail (по переводному slug + fallback) |
| `/tags/popular/` , `/categories/popular/` | Топ по `videos_count` |
| `/tags/{slug}/videos/` , `/categories/{slug}/videos/` | Видео тега/категории (cursor) |
| `/tags/{slug}/related/` , `/categories/{slug}/related/` | Related-фильтры (см. §4.4) |

**Объект тега/категории:**
```json
{
  "uuid": "…", "name": "Blondes", "slug": "blondes",
  "is_category": false,
  "is_country": false, "is_body_type": false, "is_bra_size": false,
  "is_boobs_type": false, "is_hair_color": false, "is_eye_color": false,
  "preview_image": "https://img.example.com/tags/blondes.webp",
  "sort_order": 0, "videos_count": 6500,
  "description": "…", "seo_title": "…", "seo_description": "…", "seo_h1": "…",
  "language": "ru", "fallback_language": null
}
```

Флаги `is_*` нужны для различения атрибутов актёра от контент-тегов при отображении.

### 4.2 Актёры

| GET | Назначение |
|---|---|
| `/actors/` | Список + фильтры `?q`, `?gender=woman\|man\|unknown`, `?country=<slug>`, `?sort=popular\|name\|videos_count\|newest` (PageNumber) |
| `/actors/{slug}/` | Detail |
| `/actors/popular/` | Топ по `videos_count` (кеш 1ч) |
| `/actors/{slug}/videos/` | Видео актёра (cursor) |
| `/actors/{slug}/related/` | Related-фильтры (см. §4.4) |

**Объект актёра:**
```json
{
  "uuid": "…", "gender": "woman",
  "photo": "https://img.example.com/actors/x/photo.webp",
  "cover_image": "https://img.example.com/actors/x/cover.webp",
  "birth_date": "1990-01-01", "height": 170, "weight": 55,
  "aliases": ["Alias1"],
  "videos_count": 120,
  "name": "Актриса", "slug": "aktrisa",
  "bio": "…", "short_bio": "…",
  "seo_title": "…", "seo_description": "…",
  "language": "ru", "fallback_language": null,
  "country": { "uuid": "…", "name": "Россия", "slug": "rossiya" },
  "body_type": { "uuid": "…", "name": "Стройная", "slug": "stroynaya" },
  "bra_size": null, "boobs_type": null, "hair_color": null, "eye_color": null
}
```

Атрибуты (`country`, `body_type`, `bra_size`, `boobs_type`, `hair_color`, `eye_color`) — `{uuid, name, slug}`
(локализованные) или `null`. `photo` и `cover_image` — абсолютные URL или `null`.

### 4.3 Заявка на актёра

| Метод | Путь | Auth | Запрос | Ответ |
|---|---|---|---|---|
| POST | `/videos/{uuid}/actor-suggestions/` | ✔ | `{"actor_name": "…", "comment"?: "…"}` | `201 {uuid, video, actor_name, comment, status, created_at}` |
| GET | `/me/actor-suggestions/` | ✔ | — | Список своих (PageNumber) |
| GET | `/me/actor-suggestions/{uuid}/` | ✔ | — | Одна своя или `404` |

Throttle: 10/час. Решение принимает admin вручную.

### 4.4 Related-фильтры

Для страниц тега/категории/актрисы и каталога — связанные теги/категории/актёры/атрибуты, которые чаще всего
встречаются вместе с текущей выборкой видео. Блоки «часто сочетается с», «похожие актрисы», «уточнить выборку».

| Метод | Путь | База выборки |
|---|---|---|
| GET | `/tags/{slug}/related/` | Видео тега |
| GET | `/categories/{slug}/related/` | Видео категории |
| GET | `/actors/{slug}/related/` | Видео актрисы |
| GET | `/videos/related-filters/` | Произвольные фильтры каталога |

Общие query-параметры: `lang`, `limit` (по умолч. tags:30, categories:20, actors:20, attributes:20; max 50).
Для `/videos/related-filters/` дополнительно принимает те же фильтры, что и `/videos/`: `include_tags`,
`exclude_tags`, `categories`, `actors`, `q`, `duration_min`, `duration_max`, `published_after`,
`published_before` (с теми же ограничениями: include_tags ≤10, exclude_tags ≤20, categories ≤5, actors ≤5).

**Ответ:**
```json
{
  "base": { "type": "tag|category|actor|custom", "slug": "blondes", "name": "Blondes" },
  "total_videos": 18420,
  "language": "ru",
  "fallback_language": null,
  "filters": { "include_tags": ["blondes"], "exclude_tags": [], "categories": [], "actors": [] },
  "related": {
    "tags":       [ /* item тега */ ],
    "categories": [ /* item категории */ ],
    "actors":     [ /* item актрисы */ ],
    "attributes": {
      "country":    [ /* item */ ],
      "body_type":  [],
      "bra_size":   [],
      "boobs_type": [],
      "hair_color": [],
      "eye_color":  []
    }
  }
}
```

Для `/videos/related-filters/` без выбранной сущности: `base = {"type":"custom","slug":null,"name":null}`.

**Item тега / категории / атрибута:**
```json
{
  "uuid": "…", "name": "Blonde", "slug": "blonde",
  "type": "tag",
  "preview_image": "https://img.example.com/tags/x.webp",
  "videos_count": 6500,
  "intersection_count": 1243
}
```

**Item актрисы:**
```json
{
  "uuid": "…", "name": "Actor Name", "slug": "actor-name",
  "type": "actor",
  "photo": "https://img.example.com/actors/x.webp",
  "country": { "uuid": "…", "name": "Россия", "slug": "rossiya" },
  "videos_count": 120,
  "intersection_count": 34
}
```

Сортировка в каждой группе: `intersection_count ↓`, `videos_count ↓`, `name ↑`.
Связи с `intersection_count < 2` не возвращаются. Уже выбранные фильтры в результат не включаются.
Несуществующий slug тега/актрисы → `404`. Пустая выборка → `200` с `total_videos:0` и пустыми группами.

**Где использовать:**
- `/tag/{slug}`, `/category/{slug}`, `/actor/{slug}` — соответствующий `…/related/`.
- `/videos` и `/search` — `/videos/related-filters/` с текущими фильтрами (пересчёт после каждого выбранного
  фильтра).

---

## 5. Поиск

Fulltext через PostgreSQL (trigram + aliases). Кеш 60с. `?lang` локализует результаты.

| GET | Ответ |
|---|---|
| `/search/?q=…&lang=ru` | `{ "videos": [card×≤10], "tags": [×≤10], "categories": [×≤10], "actors": [×≤10] }` |
| `/search/videos/?q=…` | Карточки видео (PageNumber, по релевантности) |
| `/search/tags/?q=…` | Теги (PageNumber) |
| `/search/categories/?q=…` | Категории (PageNumber) |
| `/search/actors/?q=…` | Актёры (PageNumber) |
| `/search/suggestions/?q=…` | `[{ "type": "tag\|category\|actor", "label": "…", "slug": "…" }]` |

**UX:** в инстант-поиске — `/search/suggestions/` (debounce ~200 мс). Страница результатов — `/search/?q=`
(вкладки по секциям). Пустой `q` → пустые результаты, не вызывать.

---

## 6. SEO

Публичные страницы рендерятся на сервере с полным `<head>`.

### 6.1 Мета сущности

`GET /seo/{video|tag|category|actor}/{slug}/?lang=ru`

```json
{
  "entity_type": "video",
  "slug": "testovoe-video",
  "language": "ru",
  "fallback_language": null,
  "canonical": "https://site.com/video/testovoe-video",
  "robots": "index,follow",
  "alternates": { "ru": "https://site.com/video/testovoe-video" },
  "meta": {
    "title": "…", "description": "…", "h1": "…", "image": "https://img.example.com/…",
    "open_graph": { "title": "…", "description": "…", "image": "…", "type": "website" },
    "twitter": { "card": "summary_large_image", "title": "…", "description": "…", "image": "…" }
  },
  "json_ld": { "@context": "https://schema.org", "@type": "VideoObject", "…": "…" }
}
```

В `<head>`: `<title>`, meta description, `<link rel="canonical">`, OpenGraph/Twitter meta,
`<script type="application/ld+json">` = `json_ld`,
hreflang (`<link rel="alternate" hreflang="ru" href="…">`), `<meta name="robots">`.

**Важно:** если `fallback_language != null` или контент «тонкий», бэк выставляет `robots:"noindex,follow"` —
фронт обязан проставить как есть.

### 6.2 Коллекции

| GET | Назначение |
|---|---|
| `/collections/` | Список активных (PageNumber, кеш 10м) |
| `/collections/{slug}/` | Detail: `{title, h1, seo_*, content, cover_image, og_image, cover_poster, slugs{lang}}` |
| `/collections/{slug}/videos/` | Видео подборки (pinned-первыми + по sort_mode) |

`cover_image`, `og_image` — абсолютные URL или `null`.

### 6.3 Редиректы slug

`GET /redirects/?slug=old-slug&entity_type=video|tag|actor|collection&lang=ru`
→ `{ "redirect": true, "new_slug": "…", "status_code": 301 }` или `{ "redirect": false }`.

Вызывать при 404 на detail-странице: если `redirect:true` — сделать `router.replace` на новый slug.

### 6.4 Sitemap и robots

`GET /sitemap.xml` (индекс) + `/sitemap-videos.xml`, `/sitemap-tags.xml`, `/sitemap-actors.xml`,
`/sitemap-collections.xml`, `GET /robots.txt`. Прокинуть через rewrite/proxy с домена фронта.
URL внутри строятся от `FRONTEND_BASE_URL` (настройка бэкенда).

---

## 7. Реклама

### 7.1 VAST (видеореклама)

| GET | Ответ |
|---|---|
| `/ads/vast/?placement=pre_roll\|mid_roll\|post_roll` | `{"name","vast_url","placement"}` или **204** |
| `/videos/{uuid}/vast/?placement=…` | То же + таргетинг по тегам/странам видео |

`204` → рекламы нет, ничего не показывать. Иначе — `vast_url` скормить IMA/video.js-ads для VAST pre/mid/post-roll.

### 7.2 Ad Slots (HTML-баннеры)

| GET | Ответ |
|---|---|
| `/ad-slots/?codes=home_top,video_sidebar` | `[{ "code", "name", "description", "html", "script", "placement" }]` |
| `/ad-slots/{code}/` | Один слот или `404` |

`html`/`script` вставлять по `code` в нужное место (`dangerouslySetInnerHTML` — контент заводится staff).
Только активные слоты возвращаются.

---

## 8. Жалобы

| Метод | Путь | Auth | Запрос | Ответ |
|---|---|---|---|---|
| GET | `/report-topics/` | — | — | `[{"slug","name"}]` (активные, кеш 1ч) |
| POST | `/videos/{uuid}/report/` | — (можно аноним) | `{"topic":"<slug>","description":"…"}` | `201 {uuid,topic,target_type:"video",description,status,created_at}` |
| POST | `/comments/{uuid}/report/` | — | `{"topic","description"}` | `201` (target_type:"comment") |
| GET | `/me/reports/` | ✔ | — | Список своих (PageNumber) |
| GET | `/me/reports/{uuid}/` | ✔ | — | Одна своя |

Перед формой подгружать `/report-topics/`. Throttle: аноним 2/час, авторизованный 5/час.

---

## 9. Личный кабинет `/me/*`

Все требуют `Authorization: Bearer`. Не кешируются (приватные).

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/me/` | Данные пользователя |
| PATCH | `/me/` | Изменить `display_name` |
| DELETE | `/me/` | Удалить аккаунт (деактивация + анонимизация) → `204` |
| POST | `/me/quick-login-link/` | Перевыпустить ссылку быстрого входа → `{quick_login_token}` |
| GET | `/me/favorites/` | Избранные видео (карточки, PageNumber) |
| GET | `/me/liked/` | Лайкнутые видео (карточки, PageNumber) |
| GET | `/me/continue-watching/` | Продолжить просмотр (`0 < watch_progress < 0.95`) |
| GET | `/me/history/` | История просмотров |
| DELETE | `/me/history/` | Очистить всю историю → `204` |
| DELETE | `/me/history/{video_uuid}/` | Удалить одно → `204` |
| GET | `/me/actor-suggestions/` | Заявки на актёров (см. §4.3) |
| GET | `/me/reports/` | Жалобы (см. §8) |

**Настройки профиля** — отдельный раздел в личном кабинете:
- Поле `display_name` — редактируемое, `PATCH /me/`.
- **Ссылка быстрого входа** — copyable input с готовой ссылкой `https://{domain}/quick-login?token=…` + кнопка «Обновить ссылку» (`POST /me/quick-login-link/`). Ссылка отображается постоянно пока пользователь на странице; после обновления страницы — нужно запросить новую. Предупреждение под полем: «Не передавайте ссылку третьим лицам».
- Кнопка «Удалить аккаунт» — confirm dialog, затем `DELETE /me/` → разлогин + редирект на главную.

---

## 10. Карта страниц → эндпоинты

| Страница | Основные вызовы |
|---|---|
| **Главная** | `/videos/trending\|popular\|new/`, `/videos/recommended/`, `/collections/`, `/ad-slots/?codes=…` |
| **Каталог** `/videos` | `/videos/?<фильтры,sort,cursor>` + `/videos/related-filters/` (блок «уточнить»); сайдбар — `/tags/`, `/categories/`, `/actors/` |
| **Страница видео** `/video/{slug}` | SSR: `/videos/{slug}/` + `/seo/video/{slug}/`; CSR: `/videos/{uuid}/view`, `/.../related/`, `/.../next/`, `/videos/{video_uuid}/comments/`, `/videos/{uuid}/vast/`, действия (reaction/favorite/progress/report/actor-suggestion) |
| **Тег** `/tag/{slug}` | `/tags/{slug}/` + `/seo/tag/{slug}/` + `/tags/{slug}/videos/` + `/tags/{slug}/related/` |
| **Категория** `/category/{slug}` | `/categories/{slug}/` + `/seo/category/{slug}/` + `/categories/{slug}/videos/` + `/categories/{slug}/related/` |
| **Актёр** `/actor/{slug}` | `/actors/{slug}/` + `/seo/actor/{slug}/` + `/actors/{slug}/videos/` + `/actors/{slug}/related/` |
| **Актёры** `/actors` | `/actors/?<filters>` |
| **Коллекция** `/collection/{slug}` | `/collections/{slug}/` + `/collections/{slug}/videos/` |
| **Поиск** `/search` | `/search/?q=`, `/search/suggestions/`, `/search/{type}/`, `/videos/related-filters/` |
| **Профиль** `/me` | `/me/`, `/me/favorites\|liked\|history\|continue-watching/`, `/me/reports/`, `/me/actor-suggestions/`, `POST /me/quick-login-link/` (в настройках) |
| **Auth** | `/auth/register\|login\|refresh\|logout/` (modal) |
| **Быстрый вход** `/quick-login` | `POST /auth/quick-login/` (токен из `?token=` URL-параметра) |

---

## 11. Кеш и производительность

| Ресурс | TTL бэкенда | Рекомендация фронта (ISR/revalidate) |
|---|---|---|
| Ленты видео | 10 мин | ~60–300с |
| Каталог `/videos/` | 5 мин | ~60с |
| Detail видео | 5 мин | ~60с |
| Detail тега/актёра | 1 ч | ~300с |
| Коллекции | 10 мин | ~60–300с |
| Related-фильтры | кешируются на бэке | не кешировать на фронте (зависит от фильтров) |
| Поиск | 60 с | — |
| Справочники (report-topics, tags, actors popular) | 1 ч | ~1800с |

- Счётчики eventually consistent (Redis-буфер, flush ~5 мин) → **оптимистичные апдейты** на клиенте.
- Дебounce `/search/suggestions/` ~200 мс; не вызывать при пустом `q`.
- Throttle `view` / `progress` в плеере (progress ~раз в 10–30с).
- При `429` показывать «попробуйте позже»; учитывать заголовок `Retry-After`.

**Лимиты throttling (ориентировочно):**

| Действие | Лимит |
|---|---|
| Аноним (общий) | 100/мин |
| Авторизованный (общий) | 300/мин |
| Auth-эндпоинты | 5/мин на IP |
| `/view/` | 30/60 сек |
| Реакции (`like`/`dislike`) | 10/30 сек (аноним) / user |
| `/progress/` | 60/мин |
| Создание комментария | 5/мин |
| Жалобы | 2/час (аноним), 5/час (user) |
| Заявка на актёра | 10/час |

---

## 12. Вне зоны публичного фронта

- **Content API** (`POST /admin/videos/`, `complete-upload/`, `verify-files/`, `GET /admin/storage-servers/`) —
  staff-only, для программы наполнения контента. Спека: `docs/UPLOADER_SPEC.md`.
- Модерация комментариев/заявок/репортов, публикация видео (`is_publish`) — Django Admin.
- Health-эндпоинты (`/health/`, `/health/db/`, `/health/redis/`) — для мониторинга, не для фронта.

---

## 13. Чек-лист соответствия

- [ ] SSR + `<head>` (canonical/hreflang/OG/JSON-LD/robots) из `/seo/*` на всех индексируемых страницах.
- [ ] Переключатель языка через `slugs`/`alternates`; проброс `?lang`.
- [ ] read-by-slug, action-by-uuid — не путать.
- [ ] JWT: refresh-rotation, 401-flow, безопасное хранение; quick-login.
- [ ] 404 → `/redirects/` для смены slug.
- [ ] Плеер: HLS ABR из `sources.hls`; `sources.trailer` для превью; VAST (`204` = без рекламы); `view`/`progress`.
- [ ] Карточки: `trailer` для автопроигрывания при hover; `poster` как обложка.
- [ ] Related-фильтры: блок «уточнить выборку» на страницах тега/актёра/каталога/поиска.
- [ ] URL изображений — использовать как готовые абсолютные URL; не приклеивать prefix.
- [ ] Комментарии: pending после отправки; сортировки; реакции.
- [ ] Оптимистичные счётчики; `429`; пустые состояния.
