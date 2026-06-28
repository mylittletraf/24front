import { SITE_NAME } from "@/lib/api/config";
import { absolute } from "./structured-data";

/**
 * Everything needed to describe a video's screenshots for image search.
 * The SEO `phrase` is already resolved to the page's current content language so the alt/caption
 * strings and structured data match what the user is reading (Google/Yandex image search rank on
 * alt text + surrounding text + structured data, in the page language).
 */
export interface ScreenshotSeoContext {
  /** Real video title — used for the parent VideoObject reference. */
  title: string;
  /**
   * Pre-built, localized SEO phrase WITHOUT the trailing frame number, e.g.
   * "1By-Day порно фото с Jessyka Swan". Targets "<studio> порно фото с <actress>" queries.
   */
  phrase: string;
  /** Long description (falls back to the per-frame label when absent). */
  description: string | null;
  /** Video publish date (ISO) — reused as each still's datePublished. */
  datePublished?: string | null;
  /** Absolute canonical page URL the images belong to. */
  pageUrl: string;
}

/** Keep alt/caption within a sane length for search engines (~160 chars). */
function clamp(text: string, max = 160): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Per-frame label (1-based): the localized SEO phrase, the frame number, and the video title at
 * the end ("… — <title>"). The frame number keeps images unique within one gallery; the title
 * keeps them unique across the many videos that share the same studio/actress phrase. The title
 * is skipped when the phrase already is the title (the no-studio/no-actress fallback).
 * Used for the <img> alt, its title, the figcaption, and the ImageObject name/caption.
 */
export function screenshotLabel(ctx: ScreenshotSeoContext, n: number): string {
  const tail = ctx.title && !ctx.phrase.includes(ctx.title) ? ` — ${ctx.title}` : "";
  return clamp(`${ctx.phrase} ${n}${tail}`);
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
    const label = screenshotLabel(ctx, n);
    return {
      "@type": "ImageObject",
      contentUrl: abs,
      url: abs,
      thumbnailUrl: abs,
      name: label,
      caption: label,
      description: ctx.description ?? label,
      ...(ctx.datePublished ? { datePublished: ctx.datePublished } : {}),
      representativeOfPage: i === 0,
      creditText: SITE_NAME,
      copyrightNotice: SITE_NAME,
      isPartOf: { "@type": "VideoObject", name: ctx.title, "@id": ctx.pageUrl, url: ctx.pageUrl },
    };
  });
}
