import { SITE_NAME } from "@/lib/api/config";
import { absolute } from "./structured-data";

/**
 * Everything needed to describe a video's screenshots for image search.
 * All text is already resolved to the page's current content language so the alt/caption
 * strings and structured data match what the user is reading (Google/Yandex image search
 * rank on alt text + surrounding text + structured data, in the page language).
 */
export interface ScreenshotSeoContext {
  /** Video title / H1 in the current language. */
  title: string;
  /** Long description (falls back to alt text when absent). */
  description: string | null;
  /** Actor names — the strongest image-search query ("<actor> <title>"). */
  actorNames: string[];
  /** Studio names — production-house context. */
  studioNames: string[];
  /** Category names — genre context. */
  categoryNames: string[];
  /** Tags + physical attributes, used as extra keywords in alt text. */
  keywords: string[];
  /** Localized noun for a still frame ("кадр" / "frame" / …). */
  frameWord: string;
  /** Video publish date (ISO) — reused as each still's datePublished. */
  datePublished?: string | null;
  /** Absolute canonical page URL the images belong to. */
  pageUrl: string;
}

/** Keep alt text within the ~125-char window search engines actually use. */
function clamp(text: string, max = 125): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Join the present, non-empty parts with " — " (drops a missing studio/actor/category cleanly). */
function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(" — ");
}

/**
 * Unique, keyword-rich alt text for screenshot N (1-based). Uniqueness (the frame number)
 * matters: duplicate alt across a gallery is ignored by image search. Order is relevance-first —
 * title, actor(s), studio, category, then a few tags, then the frame marker.
 */
export function screenshotAlt(ctx: ScreenshotSeoContext, n: number): string {
  const kw = ctx.keywords.slice(0, 3);
  return clamp(
    joinParts([
      ctx.title,
      ctx.actorNames.join(", ") || undefined,
      ctx.studioNames[0],
      ctx.categoryNames.slice(0, 2).join(", ") || undefined,
      kw.length ? kw.join(", ") : undefined,
      `${ctx.frameWord} ${n}`,
    ]),
  );
}

/**
 * Short visible caption (figcaption / title): Studio — Actress — Category — Frame N.
 * Falls back to the title when none of studio/actor/category are known, so it never
 * collapses to a bare "frame N".
 */
export function screenshotCaption(ctx: ScreenshotSeoContext, n: number): string {
  const subject = joinParts([
    ctx.studioNames[0],
    ctx.actorNames.join(", ") || undefined,
    ctx.categoryNames[0],
  ]);
  return clamp(`${subject || ctx.title} — ${ctx.frameWord} ${n}`);
}

/**
 * schema.org ImageObject nodes for the gallery — folded into the page's `@graph` (see
 * structured-data.ts `graph()`). Makes each screenshot eligible for Google/Yandex image
 * search regardless of how the tab renders it. Absolute URLs are required by the spec;
 * the first frame is flagged `representativeOfPage`.
 */
export function screenshotImageNodes(urls: string[], ctx: ScreenshotSeoContext) {
  return urls.map((url, i) => {
    const n = i + 1;
    const abs = absolute(url);
    return {
      "@type": "ImageObject",
      contentUrl: abs,
      url: abs,
      thumbnailUrl: abs,
      name: `${ctx.title} — ${ctx.frameWord} ${n}`,
      caption: screenshotCaption(ctx, n),
      description: ctx.description ?? screenshotAlt(ctx, n),
      ...(ctx.datePublished ? { datePublished: ctx.datePublished } : {}),
      representativeOfPage: i === 0,
      creditText: SITE_NAME,
      copyrightNotice: SITE_NAME,
      isPartOf: { "@type": "VideoObject", name: ctx.title, "@id": ctx.pageUrl, url: ctx.pageUrl },
    };
  });
}
