# Бэкенд-задача: Sitemap для фото (скриншоты видео)

Хендофф для бэкенда. Цель — чтобы **image-sitemap** связывал каждое видео с его скриншотами
(кадрами) и они попадали в индекс картинок (в первую очередь Яндекс.Картинки). Sitemap'ы у нас
**генерит и отдаёт бэкенд**, фронт только проксирует их со своего домена.

> **Важно (проверено 2026-06-28):** `/sitemap-images.xml` **уже существует** и уже в индексе
> `/sitemap.xml` — это задача на **исправление**, а не на создание с нуля. Что не так сейчас, см.
> «Факт на момент проверки» ниже; главное — пункт 1 (URL картинок).

## Контекст

- Все sitemap'ы бэкендные и проксируются через домен фронта рерайтами в `next.config.ts`:
  `/sitemap.xml` (индекс), `/sitemap-:slug.xml`, `/robots.txt`.
  **Важно:** рерайт `/sitemap-:slug.xml` уже ловит любой `/sitemap-<что-угодно>.xml`, поэтому
  `/sitemap-images.xml`, `/sitemap-images-1.xml`, … заработают через домен фронта **без правок
  фронтенда** — нужно только сослаться на них из индекса `/sitemap.xml`.
- На странице видео каждый скриншот уже отдаётся как `<img>` с alt/figcaption и как schema.org
  `ImageObject` в `@graph` (`src/lib/seo/screenshots.ts`, `src/components/video/screenshots.tsx`).
  Sitemap должен **указывать на те же самые URL картинок**, что и страница.
- Реалистично про приоритеты: это adult-сайт, и Google Картинки почти всё фильтруют SafeSearch'ем,
  поэтому **основной выгодополучатель — Яндекс**. Делаем в первую очередь под него, но формат
  стандартный (Google Image sitemap), вреда нет.

## Факт на момент проверки (что уже есть и что чинить)

Проверено `curl` по бэкенду `http://127.0.0.1:8000`:

- `/sitemap.xml` (200) — индекс, перечисляет `sitemap-videos / images / tags / actors / collections`,
  все `<loc>` на домене фронта (`http://localhost:3000/…`). ✅
- `/sitemap-images.xml` (200) — валидный XML, namespace
  `image="http://www.google.com/schemas/sitemap-image/1.1"`, структура «`<url>` страницы → вложенные
  `<image:image>` (постер + кадры)». ✅ Каркас правильный.

**Что починить:**

1. ❌ **`<image:loc>` отдаётся сырым хостом хранилища**, например
   `http://localhost:8000/local-storage/local-image/v/<uuid>/screens/1.webp`. На странице же `<img>`
   и `ImageObject.contentUrl` — это **маскированный** URL на домене фронта (`/media/…`). То есть
   sitemap указывает на **другой** (и потенциально непубличный, внутренний) URL, чем тот, что видит
   краулер на странице. Это и есть главная правка — см. пункт 1 ниже. Тот же баг в
   `/sitemap-videos.xml` → `<video:thumbnail_loc>` (тоже сырой `localhost:8000`).
2. ❌ **`<image:title>` = просто название видео**, одинаковое для всех кадров одного видео. Лучше —
   уникальная per-frame подпись, совпадающая с alt на странице (см. пункт 2 ниже).
3. ⚠️ **Дедуп**: поле `screens` у части видео содержит постер первым элементом (проверено: у одного
   видео `screens[0]` == `…/poster.webp`), у других — нет. Чтобы постер не попал в `<url>` дважды,
   дедуплицировать по `<image:loc>` (см. «Какие картинки включать» в пункте 2).

## 1. Самое важное: URL картинки должен совпадать со страницей

`<image:loc>` обязан быть **байт-в-байт** тем же абсолютным URL, который рендерит страница видео
(`<img src>` и `ImageObject.contentUrl`). У нас все медиа-URL хранилища **маскируются** в
same-origin `/media/...` (анти-личинг, см. `src/lib/media.ts` + `MEDIA_PROTECTION_BACKEND_TASK.md`).
Поэтому **нельзя** класть в sitemap «сырой» URL хранилища — только замаскированный на домене фронта.

Правило преобразования (тот же алгоритм, что `maskAbsolute` во фронте):

```
storage URL:  <scheme>://<host>[:port]/<path>[?query]
image:loc  =  https://<ДОМЕН_ФРОНТА>/media/<scheme>/<host>[:port]/<path>[?query]
```

Примеры:

```
https://cdn-7.example.com/v/514/screen-03.jpg
  → https://front.example.com/media/https/cdn-7.example.com/v/514/screen-03.jpg

http://storage:8000/local-storage/v/514/screen-03.jpg
  → https://front.example.com/media/http/storage:8000/local-storage/v/514/screen-03.jpg
```

Проверенный пример из текущего дева (то, что сейчас в sitemap **неверно**, и как должно быть):

```
сейчас (баг): http://localhost:8000/local-storage/local-image/v/<uuid>/screens/1.webp
надо:         https://<ДОМЕН_ФРОНТА>/media/http/localhost:8000/local-storage/local-image/v/<uuid>/screens/1.webp
```

(`<scheme>` без двоеточия; `<host>` с портом, если он есть.) Это ровно тот URL, что уже стоит в
`<img src>` и в `ImageObject.contentUrl` на странице — проверяется через «Просмотр кода» любой
страницы видео.

> Если позже медиа переедет на прямые подписанные URL (`MEDIA_PROTECTION_BACKEND_TASK.md`),
> `<image:loc>` должен следовать за тем, что реально рендерит страница, — но это отдельная задача.

## 2. Структура и формат

Image-sitemap группирует картинки **по странице, на которой они показаны**. Один `<url>` — это
watch-страница видео, внутри — все её кадры.

- `<loc>` — канонический URL страницы видео: `https://<ДОМЕН_ФРОНТА>/video/<slug>` (язык по
  умолчанию, `NEXT_PUBLIC_DEFAULT_LANG`; hreflang в image-sitemap не передаётся).
- `<lastmod>` — дата изменения видео (ISO 8601), помогает переобходу. Необязательно, но желательно.
- Вложенные `<image:image>` — постер + все уникальные кадры (`poster` + `screens`).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://front.example.com/video/dzhessika-liubit-provodit-vremia-s-perchikom</loc>
    <lastmod>2026-06-20</lastmod>
    <image:image>
      <image:loc>https://front.example.com/media/https/cdn-7.example.com/v/514/poster.jpg</image:loc>
      <image:caption>1By-Day порно фото с Jessyka Swan 1 — Джессика любит проводить время с перчиком</image:caption>
    </image:image>
    <image:image>
      <image:loc>https://front.example.com/media/https/cdn-7.example.com/v/514/screen-02.jpg</image:loc>
      <image:caption>1By-Day порно фото с Jessyka Swan 2 — Джессика любит проводить время с перчиком</image:caption>
    </image:image>
    <!-- … остальные кадры … -->
  </url>
  <!-- … остальные видео … -->
</urlset>
```

### Какие картинки включать
- Постер (`poster`) + все кадры (`screens`).
- **Дедуп**: API нередко повторяет постер первым кадром — на фронте кадры дедуплицируются
  (`Array.from(new Set(screens))`). В sitemap тоже не дублировать один и тот же `<image:loc>`.
- Только реально существующие файлы (не класть пустые/битые).

### `<image:caption>` / `<image:title>` — опционально (под Яндекс)
Google с 2022 г. игнорирует все теги кроме `<image:loc>`; Яндекс — учитывает. Если несложно, кладите
`<image:caption>`, **совпадающий с alt/подписью на странице**, в формате:

```
<studio> порно фото с <actress> <N> — <title>
```

где `<N>` — порядковый номер кадра (постер = 1), `<title>` — название видео. Фолбэки, когда чего-то
нет (как на фронте, см. ключи `shotStudioActor` / `shotActor` / `shotStudio` в `src/messages/*.json`):
- нет студии → `Порно фото с <actress> <N> — <title>`;
- нет актрисы → `<studio> порно фото <N> — <title>`;
- нет ни студии, ни актрисы → `<title> <N>` (без хвоста `— <title>`).

Язык подписи — по умолчанию (`NEXT_PUBLIC_DEFAULT_LANG`). Если поддерживать формат в синхроне дорого —
**кладите только `<image:loc>`**, это и есть главное; подпись вторична.

## 3. Шардирование, индекс, robots

- Лимиты на файл: **≤ 50 000 `<url>` и ≤ 50 МБ** в несжатом виде. Вложенные `<image:image>` в этот
  счётчик `<url>` не идут, но 50 МБ держим — при больших каталогах **шардируем**:
  `/sitemap-images-1.xml`, `/sitemap-images-2.xml`, … Допустим gzip (`*.xml.gz`).
- Добавить все файлы image-sitemap в **индекс** `/sitemap.xml` (`<sitemapindex>` → `<sitemap><loc>`).
- В `robots.txt` индекс `/sitemap.xml` уже должен быть указан — отдельной строки на image-sitemap не
  требуется, он подтянется из индекса.
- URL внутри файлов — на **домене фронта** (`https://<ДОМЕН_ФРОНТА>/…`), т.к. отдаётся через рерайт
  фронта. Никаких внутренних хостов в `<loc>`/`<image:loc>`, кроме как внутри `/media/<scheme>/<host>/…`
  (там host хранилища — это нормально, так же как на странице).

## 4. Критерии приёмки

1. **(главное)** Для произвольного видео `<image:loc>` **посимвольно равен** `src` соответствующего
   `<img>` на странице `/video/<slug>` (и `ImageObject.contentUrl` в JSON-LD) — т.е. маскированный
   `https://<ДОМЕН_ФРОНТА>/media/…`, **не** сырой хост хранилища. Сейчас это нарушено.
2. В `<image:loc>` (и в `<video:thumbnail_loc>` у `/sitemap-videos.xml`) **нет** хоста хранилища в
   роли самого хоста URL: `grep -o 'localhost:8000' | grep -v '/media/'` по выгрузке должен быть пуст
   (host хранилища допустим только **внутри** пути `/media/<scheme>/<host>/…`).
3. Открытие любого `<image:loc>` в браузере реально отдаёт картинку (проксирование `/media` работает).
4. Нет дублей `<image:loc>` внутри одного `<url>`; постер не повторяется кадром.
5. `/sitemap.xml` (через домен фронта) перечисляет `/sitemap-images*.xml`; XML валиден, namespace
   `xmlns:image=…/sitemap-image/1.1` на месте.
6. (желательно) `<image:caption>`/`<image:title>` уникальны по кадрам, а не одно название на все.
7. Файлы укладываются в лимиты (50k url / 50 МБ), при превышении — шардирование.
8. Валидно в **Яндекс.Вебмастер → Индексирование → Файлы Sitemap** и в
   **Google Search Console → Файлы Sitemap** (ошибок парсинга нет).

## 5. Вне зоны бэкенда (справочно)

- **Фронт правок не требует**: рерайт `/sitemap-:slug.xml` уже проксирует `/sitemap-images*.xml`.
  Если решите назвать файл иначе, сохраните схему `sitemap-<slug>.xml` (один сегмент без слешей),
  иначе рерайт не сматчит.
- Источники данных у бэкенда уже есть (slug, poster, screens, title/studio/actors по языкам, даты) —
  новый публичный API не нужен, sitemap строится из БД.

## Полезные ссылки
- Google Image sitemaps: <https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps>
- Яндекс, sitemap: <https://yandex.ru/support/webmaster/indexing-options/sitemap.html>
