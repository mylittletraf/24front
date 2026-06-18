# Filter Subscriptions + Feed — Frontend Patch

## Overview

Users can now save any video filter combination as a "subscription" and receive a
time-bucketed feed showing new videos that match their subscriptions.

---

## New Endpoints

### 1. `GET /api/v1/me/filter-subscriptions/`

List all active subscriptions for the authenticated user.

**Auth:** Bearer token required.

**Response `200`:**
```json
[
  {
    "uuid": "3f7a8c12-...",
    "name": "Театр + Рассвет",
    "is_active": true,
    "sort_order": 0,
    "include_tags": "rassvet",
    "exclude_tags": "",
    "categories": "teatr",
    "actors": "",
    "q": "",
    "duration_min": null,
    "duration_max": null,
    "actor_country": "",
    "actor_body_type": "",
    "actor_bra_size": "",
    "actor_boobs_type": "",
    "actor_hair_color": "",
    "actor_eye_color": "",
    "created_at": "2026-06-18T12:00:00Z",
    "updated_at": "2026-06-18T12:00:00Z"
  }
]
```

---

### 2. `POST /api/v1/me/filter-subscriptions/`

Create a new subscription. Pass the current page's active filter params + a human-readable `name`.

**Auth:** Bearer token required.

**Request body:**
```json
{
  "name": "Театр + Рассвет",
  "categories": "teatr",
  "include_tags": "rassvet"
}
```

All filter fields are optional except `name`. Accepted fields:

| Field | Type | Example |
|---|---|---|
| `name` | string (required) | `"Театр + Рассвет"` |
| `include_tags` | comma-sep slugs | `"rassvet,padenie-2"` |
| `exclude_tags` | comma-sep slugs | `""` |
| `categories` | comma-sep slugs | `"teatr"` |
| `actors` | comma-sep slugs | `"anna-myuller"` |
| `q` | string | `"ночь"` |
| `duration_min` | integer (seconds) | `300` |
| `duration_max` | integer (seconds) | `3600` |
| `actor_country` | slug | `"germaniya"` |
| `actor_body_type` | slug | `"stroynaya"` |
| `actor_bra_size` | slug | `"75b"` |
| `actor_boobs_type` | slug | `"naturalnaya"` |
| `actor_hair_color` | slug | `"blondinka"` |
| `actor_eye_color` | slug | `"golubye"` |
| `is_active` | boolean | `true` |
| `sort_order` | integer | `0` |

**Response `201`:** same shape as GET item.

**Errors:**
- `400` — `name` is empty
- `400` — limit reached (max 20 active subscriptions per user)
- `401` — not authenticated

---

### 3. `PATCH /api/v1/me/filter-subscriptions/{uuid}/`

Update name, active status, sort order, or any filter field. Partial update — only send changed fields.

**Auth:** Bearer token required.

**Example (rename + deactivate):**
```json
{ "name": "Новое название", "is_active": false }
```

**Response `200`:** updated subscription object.
**Response `404`:** subscription belongs to another user.

---

### 4. `DELETE /api/v1/me/filter-subscriptions/{uuid}/`

Delete a subscription permanently.

**Auth:** Bearer token required.

**Response `204` No Content.**
**Response `404`:** subscription belongs to another user.

---

### 5. `GET /api/v1/me/feed/?lang=ru`

Subscription feed. Returns videos grouped by time bucket and subscription.

**Auth:** Bearer token required.

**Response `200`:**
```json
{
  "buckets": [
    {
      "label": "today",
      "date_from": "2026-06-18",
      "date_to": "2026-06-18",
      "groups": [
        {
          "subscription": {
            "uuid": "3f7a8c12-...",
            "name": "Театр + Рассвет",
            "categories": "teatr",
            "include_tags": "rassvet",
            ...
          },
          "total": 7,
          "videos": [ /* up to 10 VideoCard objects */ ]
        },
        {
          "subscription": {
            "uuid": "9b2d1e44-...",
            "name": "Медицина + Силикон",
            "categories": "meditsina,kultura",
            "actor_boobs_type": "silikonovaya",
            ...
          },
          "total": 3,
          "videos": [ /* up to 10 VideoCard objects */ ]
        }
      ]
    },
    {
      "label": "last_week",
      "date_from": "2026-06-11",
      "date_to": "2026-06-17",
      "groups": [ ... ]
    }
  ]
}
```

**Bucket labels:**

| label | Range |
|---|---|
| `today` | Today |
| `last_week` | 1–7 days ago |
| `last_month` | 8–30 days ago |
| `prev_month` | 31–60 days ago |
| `3_months` | 61–90 days ago |

- Empty buckets and empty groups are omitted.
- Max 10 videos per group. If `total > 10`, show a "Show all" link (see below).
- Max lookback: 90 days.

---

## How to Wire the "Subscribe" Button

The subscription captures the **current filter state** of the page the user is on.
Collect the active filter params and pass them directly to `POST /me/filter-subscriptions/`.
The frontend already has translated names for tags/categories/actors — use them to build `name`.

### From a tag page (`/tag/{slug}?include_tags=foo&categories=bar`)
```json
{
  "name": "Громкий дом + Рассвет + Театр",
  "include_tags": "rassvet",
  "categories": "teatr"
}
```
Note: the base tag (`gromkiy-dom`) is the page context — include it in `include_tags` or `categories` as appropriate.

### From a category page (`/category/{slug}?include_tags=foo`)
```json
{
  "name": "Медицина + Рассвет",
  "categories": "meditsina",
  "include_tags": "rassvet"
}
```

### From the actor page (`/actor/{slug}`)
```json
{
  "name": "Анна Мюллер",
  "actors": "anna-myuller"
}
```

### From the catalog with attribute filters (`?actor_boobs_type=silikonovaya&categories=kultura`)
```json
{
  "name": "Культура + Силиконовая",
  "categories": "kultura",
  "actor_boobs_type": "silikonovaya"
}
```

---

## Feed Rendering

Suggested layout for `GET /me/feed/`:

```
[Bucket: Сегодня — 18 июня]

  [Subscription chip: "Театр + Рассвет"]
    video card  video card  video card  …  [Показать все 7 →]

  [Subscription chip: "Медицина + Силикон"]
    video card  video card  [Показать все 3 →]

[Bucket: На прошлой неделе — 11–17 июня]
  …
```

### "Show all" link

When `total > 10`, render a link to the full filtered catalog:

```
/videos/?categories=teatr&include_tags=rassvet&published_after=2026-06-18&published_before=2026-06-18
```

Build it from:
- The subscription's filter fields (non-empty values)
- The bucket's `date_from` / `date_to` as `published_after` / `published_before`

---

## Edge Cases

| Case | Handling |
|---|---|
| No subscriptions | `buckets: []` — show "Subscribe to tags to see your feed" empty state |
| No matching videos in any bucket | `buckets: []` — show "Nothing new yet" |
| Subscription limit (20) reached | `POST` returns `400` — show toast "Достигнут лимит подписок (20)" |
| `total > 10` in a group | Show truncated list + "Показать все N →" link to full catalog |
| Deactivated subscription | Not shown in feed (`is_active=false` subs are excluded) |
