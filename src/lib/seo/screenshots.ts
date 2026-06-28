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

/** Keep alt/caption within the ~125-char window search engines actually use. */
function clamp(text: string, max = 125): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Per-frame label (1-based): the localized SEO phrase plus the frame number. The number keeps
 * each gallery image's alt/caption unique — image search ignores duplicate alt across a gallery.
 * Used for the <img> alt, its title, the figcaption, and the ImageObject name/caption.
 */
export function screenshotLabel(ctx: ScreenshotSeoContext, n: number): string {
  return clamp(`${ctx.phrase} ${n}`);
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
