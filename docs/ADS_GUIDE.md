# Руководство: размещение рекламы (creatives с бэкенда)

Полный разбор: как фронтенд получает рекламу с бэкенда и как разместить каждый формат.
Все примеры — в стиле текущего кода (TanStack Query, клиентские компоненты, `useMediaQuery`).

---

## 0. Как реклама приходит с бэкенда (контракт)

Есть **два** источника, оба уже описаны в `FRONTEND_SPEC.md` §7.

### 0.1. VAST (видеореклама в плеере)
```
GET /api/v1/ads/vast/?placement=pre_roll|mid_roll|post_roll        # глобальный тег
GET /api/v1/videos/{uuid}/vast/?placement=…                        # тег с таргетингом по видео
```
- **200** → `{ "name", "vast_url", "placement" }` — `vast_url` это VAST/VPAID-тег для IMA.
- **204** → рекламы нет, ничего не показываем (самый частый ответ).

Во фронте уже есть `getVast(videoUuid, placement)` (`src/lib/api/video-actions.ts`) — возвращает
`vast_url | null`. Плеер (`src/components/video/player.tsx`) уже **запрашивает** pre_roll, но пока
не отдаёт его в ads-плагин — это мы и доделаем (§4.4).

### 0.2. Ad-slots (HTML/JS-блоки: catfish, push, clickunder, нативка)
```
GET /api/v1/ad-slots/?codes=catfish,inpage_push,clickunder,native_catalog
GET /api/v1/ad-slots/{code}/
```
Ответ — массив:
```json
[{ "code": "catfish", "name": "...", "description": "...",
   "html": "<div>…</div>", "script": "https://net/loader.js | inline-code | direct-link",
   "placement": "catfish" }]
```
- `html` — разметка для вставки (может быть пустой).
- `script` — либо **URL** внешнего скрипта, либо **inline-код**, либо (для кликандера) **директ-ссылка**.
- Пустые `html`/`script` ⇒ слот не сконфигурирован ⇒ ничего не рендерим.

> На бэке сейчас заведён только `code: catfish` (пустой). Остальные коды (см. §4) заводит
> бэкенд-команда — это **шаг 0** для каждого места.

Проверить, что бэк отдаёт слот:
```bash
curl -s "http://127.0.0.1:8000/api/v1/ad-slots/?codes=catfish,inpage_push" | jq
```

---

## 1. Фундамент (делается один раз)

### 1.1. API-клиент — `src/lib/api/ads.ts`
```ts
import { z } from "zod";
import { apiFetch } from "./fetcher";

export const AdSlotSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  html: z.string().default(""),
  script: z.string().default(""),
  placement: z.string().optional(),
});
export type AdSlot = z.infer<typeof AdSlotSchema>;

/** Загружает слоты по кодам. Пустые/битые отбрасываются. */
export async function getAdSlots(codes: string[]): Promise<Record<string, AdSlot>> {
  if (codes.length === 0) return {};
  try {
    const data = await apiFetch<unknown>("/ad-slots/", {
      params: { codes: codes.join(",") },
      cache: "no-store", // ротация креативов; не кешируем
    });
    const parsed = z.array(AdSlotSchema).safeParse(data);
    const map: Record<string, AdSlot> = {};
    for (const slot of parsed.success ? parsed.data : []) map[slot.code] = slot;
    return map;
  } catch {
    return {};
  }
}
```

### 1.2. Хук загрузки слотов — `src/lib/hooks/use-ad-slot.ts`
```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { getAdSlots, type AdSlot } from "@/lib/api/ads";

export function useAdSlot(code: string): AdSlot | null {
  const { data } = useQuery({
    queryKey: ["ad-slots", code],
    queryFn: () => getAdSlots([code]),
    staleTime: 5 * 60_000,
  });
  const slot = data?.[code];
  // Рендерим только если слот реально сконфигурирован.
  return slot && (slot.html || slot.script) ? slot : null;
}
```

### 1.3. Безопасный рендер `html` + исполнение `script` — `src/components/ads/ad-slot-render.tsx`
> React `dangerouslySetInnerHTML` **не выполняет** `<script>`. Поэтому скрипты пересоздаём вручную.
```tsx
"use client";
import { useEffect, useRef } from "react";
import type { AdSlot } from "@/lib/api/ads";

function isUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

export function AdSlotRender({ slot, className }: { slot: AdSlot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = slot.html ?? "";
    // Пересоздаём <script> из html (иначе они не исполнятся).
    host.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.text = old.textContent ?? "";
      old.replaceWith(s);
    });
    // Поле script: URL внешнего скрипта или inline-код.
    if (slot.script) {
      const s = document.createElement("script");
      if (isUrl(slot.script)) s.src = slot.script;
      else s.text = slot.script;
      s.async = true;
      host.appendChild(s);
    }
    return () => {
      host.innerHTML = "";
    };
  }, [slot]);
  return <div ref={ref} className={className} data-ad-slot={slot.code} />;
}
```

### 1.4. Гейтинг по устройству + частотный кап — `src/lib/ads.ts`
```ts
// Капы (показ N раз за период) — чтобы не спамить. Хранится в localStorage.
export function frequencyOk(key: string, maxPerDay = 1): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(`ad:${key}`);
  const rec = raw ? (JSON.parse(raw) as { d: string; n: number }) : { d: today, n: 0 };
  if (rec.d !== today) Object.assign(rec, { d: today, n: 0 });
  if (rec.n >= maxPerDay) return false;
  rec.n += 1;
  localStorage.setItem(`ad:${key}`, JSON.stringify(rec));
  return true;
}
```
Гейтинг mobile/desktop — уже есть `useMediaQuery` (`src/lib/hooks/use-media-query.ts`) и `useMounted`
(рендерить рекламу только на клиенте, чтобы не было hydration-mismatch). Брейкпоинт `desktop` в проекте
= **≥1024px**.

---

## 2. Глобальный контейнер реклам

Создаём один клиентский компонент и монтируем в layout — он сам решает, что показать на текущем
устройстве. `src/components/ads/ad-layer.tsx`:
```tsx
"use client";
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { CatfishAd } from "./catfish-ad";       // §4.1
import { InPagePushAd } from "./inpage-push-ad"; // §4.2

export function AdLayer() {
  const mounted = useMounted();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  if (!mounted) return null;                 // только клиент
  return isDesktop ? <InPagePushAd /> : <CatfishAd />;
}
```
Монтаж в `src/app/layout.tsx` внутри `<Providers>` (после `<Footer />`):
```tsx
            <Footer />
            <AdLayer />
```

---

## 3. (общий приём) фиксированный оверлей с крестиком
Для catfish/push используем фиксированный блок снизу/сверху с кнопкой закрытия и localStorage-памятью.

---

## 4. Реализация по каждому месту

### 4.1. Catfish / стикер снизу — **mobile only**
**Шаг 0 (бэк):** код слота `catfish` (placement `catfish`) с `html`/`script` баннера.
**Компонент** `src/components/ads/catfish-ad.tsx`:
```tsx
"use client";
import { X } from "lucide-react";
import { useState } from "react";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { AdSlotRender } from "./ad-slot-render";

export function CatfishAd() {
  const slot = useAdSlot("catfish");
  const [closed, setClosed] = useState(false);
  if (!slot || closed) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-border bg-background/95 p-1 desktop:hidden">
      <AdSlotRender slot={slot} className="min-h-[50px] w-full max-w-[360px]" />
      <button aria-label="Закрыть" onClick={() => setClosed(true)}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white">
        <X size={14} />
      </button>
    </div>
  );
}
```
- Чтобы стикер не перекрывал нижний контент — добавьте `padding-bottom` body на мобиле, либо
  учитывайте высоту (≈60px).
- Частотный кап обычно не нужен (постоянный стикер), но кнопку «закрыть» помним на сессию.

### 4.2. In-page push снизу/вверху — **desktop only**
**Шаг 0 (бэк):** код слота `inpage_push` (js-лоадер сети в `script`).
**Компонент** `src/components/ads/inpage-push-ad.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { AdSlotRender } from "./ad-slot-render";
import { frequencyOk } from "@/lib/ads";

export function InPagePushAd() {
  const slot = useAdSlot("inpage_push");
  // многие push-сети сами рисуют оверлей через свой script — тогда достаточно его выполнить;
  // частотный кап на стороне фронта как страховка:
  useEffect(() => {
    if (slot) frequencyOk("inpage_push", 3); // не больше 3 показов/день
  }, [slot]);
  if (!slot) return null;
  return <AdSlotRender slot={slot} className="hidden desktop:block" />;
}
```
- Если push-сеть сама позиционирует блок — `html`/`script` это сделают; div-контейнер скрыт, скрипт
  работает. Если нужно своё позиционирование — оберните в `fixed top-0`/`bottom-0`.

### 4.3. Кликандер (popunder) при переходе на detail-страницу — **direct link**
**Шаг 0 (бэк):** код слота `clickander_play`, где **директ-ссылка** лежит в `script`. 204/пусто ⇒
не открываем ничего.
**Где:** хук `useClickunder` (`src/components/ads/use-clickunder.ts`) + `clickunderClickStep` в
`src/lib/ads.ts`. Хук вешается на `onClick` ссылки видео-карточки (`VideoCard`,
`VideoCardHorizontal`) — окно открывается **в момент клика по карточке** (доверенный жест, попап не
режется), пользователь при этом штатно уходит на detail-страницу.

**Каденс:** окно открывается на **1-м, 3-м и 5-м** переходе на detail-страницу (клик по карточке в
каталоге/поиске/похожих), после чего — **пауза 60 минут**, затем цикл повторяется. Переходы 2 и 4 (и
любые во время паузы) проглатываются. Счётчик и пауза хранятся в `localStorage`
(`ad:cu:clickander_play`), поэтому каденс сквозной между страницами. К идентификатору слота в
аналитике дописывается номер: `clickander_play_click-1` / `_click-3` / `_click-5`.

```tsx
// внутри VideoCard
const fireClickunder = useClickunder();
<Link href={`/video/${video.slug}`} onClick={fireClickunder}>…</Link>

// useClickunder()
const step = clickunderClickStep("clickander_play", 60 * 60 * 1000); // 1/3/5 → номер, иначе null
if (step !== null && link) {
  track("ad_clickunder", { slot: `clickander_play_click-${step}` });
  const w = window.open(link, "_blank", "noopener");
  w?.blur?.();
  window.focus();
}
```
> Нюансы:
> - Триггер — клик по карточке (а не по плееру/`play`): жест гарантированно «доверенный», и это
>   именно «переход на видео из каталога/поиска».
> - Счётчик не тикает, пока нет ссылки (`script`) — слот тянется в карточках через `useAdSlot`
>   (один кэшированный запрос на список). В embed карточек нет, поэтому кликандера там нет.
> - Это агрессивный формат: убедитесь, что это разрешено вашим инвентарём/политикой.

### 4.4. VAST pre-roll и post-roll (в плеере)
**Шаг 0 (бэк):** `/videos/{uuid}/vast/?placement=pre_roll` и `=post_roll` возвращают `vast_url`
(или 204). Уже есть `getVast`.

1. Поставить плагины:
```bash
npm i videojs-contrib-ads videojs-ima
```
   и подключить Google IMA SDK (скрипт `//imasdk.googleapis.com/js/sdkloader/ima3.js` — добавить в
   `<head>` или грузить динамически).
2. В `player.tsx`, после создания `player`, заменить «холостой» `getVast(...)` на реальную инициализацию:
```ts
import "videojs-contrib-ads";
import "videojs-ima";

const preroll = await getVast(uuid, "pre_roll"); // string | null
if (preroll) {
  // @ts-expect-error плагин расширяет player в рантайме
  player.ima({ adTagUrl: preroll });
}
```
3. **Post-roll:** запросить отдельно и проиграть на `ended`:
```ts
player.one("ended", async () => {
  const postroll = await getVast(uuid, "post_roll");
  if (postroll) {
    // @ts-expect-error
    player.ima.changeAdTag(postroll);
    // @ts-expect-error
    player.ima.requestAds();
  }
});
```
> Альтернатива: если бэк умеет отдавать **VMAP** (один тег с pre+mid+post) — передать его в `ima()`
> один раз, тогда IMA сам отыграет постролл. Уточните у бэка формат.
> - 204 на любом placement ⇒ просто не инициализируем рекламу (контент играет как обычно).
> - Не блокируйте старт контента ожиданием VAST дольше таймаута (например, 2–3 c) — fallback на
>   контент.

### 4.5. Нативные блоки в каталоге — каждые 15 видео, **mobile only**
**Шаг 0 (бэк):** код слота `native_catalog` (html/script нативного блока сети).
**Где:** `src/components/video/infinite-video-feed.tsx` — интерливим ad-карточку в грид.

1. Загрузить слот и устройство:
```tsx
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { AdSlotRender } from "@/components/ads/ad-slot-render";
// ...
const native = useAdSlot("native_catalog");
const isMobile = useMediaQuery("(max-width: 1023px)");
const showNative = useMounted() && isMobile && !!native;
```
2. Вставлять блок каждые 15 карточек (на всю ширину строки грида):
```tsx
<VideoGrid>
  {videos.map((video, i) => (
    <Fragment key={video.uuid}>
      <VideoCard video={video} priority={i < priorityCount} />
      {showNative && (i + 1) % 15 === 0 ? (
        <AdSlotRender
          slot={native!}
          className="col-span-full"   /* занять всю строку грида */
        />
      ) : null}
    </Fragment>
  ))}
  {/* ...skeletons... */}
</VideoGrid>
```
> Тот же слот можно переиспользовать; если нужны разные креативы на разных позициях — заводите коды
> `native_catalog_1`, `native_catalog_2`… и чередуйте. `col-span-full` гарантирует, что блок не ломает
> сетку карточек.

---

## 5. Что делать после (обязательные шаги перед продакшеном)

1. **Завести коды слотов на бэке** для каждого места: `catfish`, `inpage_push`, `clickunder`,
   `native_catalog` (+ VAST `pre_roll`/`post_roll`). Проверить `curl .../ad-slots/?codes=…`.
2. **Тестирование каждого формата** (dev-сервер поднимаете вы):
   - catfish — только мобильная ширина, кнопка закрытия, не перекрывает контент;
   - push — только desktop, не чаще кап;
   - clickunder — окно открывается при переходе на detail из каталога/поиска (клик по карточке) на 1/3/5-м переходе, затем пауза 60 мин;
   - VAST — pre-roll до контента, post-roll после `ended`, 204 не ломает воспроизведение;
   - нативка — каждые 15 карточек, только mobile, на всю ширину строки.
3. **Частотные капы и память закрытия** — проверить `frequencyOk` и `localStorage`-флаги.
4. **CSP / sandbox.** Сторонние скрипты часто блокируются Content-Security-Policy. Если задаёте CSP
   (headers в `next.config.ts`) — добавьте домены сетей в `script-src`/`frame-src`/`connect-src`,
   иначе реклама молча не загрузится. Тяжёлые/недоверенные креативы лучше держать в `<iframe sandbox>`.
5. **Производительность и CLS.** Резервируйте высоту под баннер (`min-height`), чтобы не прыгал контент;
   грузите ad-скрипты `async`/лениво; не блокируйте основной рендер.
6. **Детект адблока (опционально).** Если показ обязателен — мягкий просящий баннер при отсутствии
   загрузки слота.
7. **Согласие/возраст/право.** Учтите 18+ и GDPR/консент: не дёргайте трекинговые ad-скрипты до согласия,
   если это требуется юрисдикцией.
8. **Аналитика.** Шлите события показа/клика (через существующий `Analytics`/`dataLayer`,
   `src/components/analytics.tsx`) для сверки с отчётами рекламной сети и контроля fill-rate.
9. **Антифрод/политика.** Кликандер и push — агрессивные форматы; согласуйте с рекламодателем
   допустимые частоты и страницы, где их не показывать (например, не на странице оплаты/профиля).
10. **Финальная проверка:** `npm run check-all` (type-check + lint + prettier) и `npm run build`
    зелёные. Прогон в проде (`next build` + ваш `next start`) — без CLS и ошибок консоли.

---

## 6. Карта «место → код слота → файл → устройство»

| Формат | Источник | Код/placement | Где монтируется | Устройство |
|---|---|---|---|---|
| Catfish/стикер | ad-slot | `catfish` | `AdLayer` → `CatfishAd` (layout) | mobile |
| In-page push | ad-slot | `inpage_push` | `AdLayer` → `InPagePushAd` (layout) | desktop |
| Clickunder (директ) | ad-slot | `clickander_play` | `useClickunder` в `VideoCard`/`VideoCardHorizontal` (клик по карточке, 1/3/5, пауза 60 мин) | both |
| VAST pre-roll | VAST | `pre_roll` | `player.tsx` (IMA) | both |
| VAST post-roll | VAST | `post_roll` | `player.tsx` на `ended` (IMA) | both |
| Нативка в каталоге | ad-slot | `native_catalog` | `infinite-video-feed.tsx`, каждые 15 | mobile |

---

## 7. Траблшутинг
- **Слот не показывается:** `html` и `script` пустые ⇒ бэк не сконфигурировал код; проверьте `curl`.
- **Скрипт не выполняется:** убедитесь, что используете `AdSlotRender` (он пересоздаёт `<script>`),
  а не голый `dangerouslySetInnerHTML`.
- **Попап кликандера режется:** перенесите `window.open` строго в обработчик клика по Play.
- **VAST не играет:** 204 (рекламы нет — норма) либо не подключён IMA SDK / `videojs-ima`.
- **Реклама не грузится в проде, в dev ок:** скорее всего CSP режет домены — добавьте их в заголовки.
- **Прыгает вёрстка (CLS):** задайте `min-height` контейнерам слотов.
