import { SITE_NAME, SITE_URL } from "@/lib/api/config";

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
  /** Tags + attributes + categories, used as extra keywords in alt/caption. */
  keywords: string[];
  /** Localized noun for a still frame ("кадр" / "frame" / …). */
  frameWord: string;
  /** Absolute canonical page URL the images belong to. */
  pageUrl: string;
}

function absolute(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

/** Keep alt text within the ~125-char window search engines actually use. */
function clamp(text: string, max = 125): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Unique, keyword-rich alt text for screenshot N (1-based). Uniqueness (the frame number)
 * matters: duplicate alt across a gallery is ignored by image search. Order is chosen for
 * relevance — title, then actor(s), then tags/attributes, then the frame marker.
 */
export function screenshotAlt(ctx: ScreenshotSeoContext, n: number): string {
  const parts = [ctx.title];
  if (ctx.actorNames.length) parts.push(ctx.actorNames.join(", "));
  const kw = ctx.keywords.slice(0, 4);
  if (kw.length) parts.push(kw.join(", "));
  parts.push(`${ctx.frameWord} ${n}`);
  return clamp(parts.join(" — "));
}

/** Short visible caption (figcaption) — primary subject + frame number. */
export function screenshotCaption(ctx: ScreenshotSeoContext, n: number): string {
  const subject = ctx.actorNames[0] ?? ctx.title;
  return `${subject} — ${ctx.frameWord} ${n}`;
}

/**
 * schema.org ImageObject `@graph` for the gallery — makes each screenshot eligible for
 * Google/Yandex image search independently of how the tab renders it. Absolute URLs are
 * required by the spec; the first frame is flagged `representativeOfPage`.
 */
export function screenshotJsonLd(urls: string[], ctx: ScreenshotSeoContext) {
  return {
    "@context": "https://schema.org",
    "@graph": urls.map((url, i) => {
      const n = i + 1;
      const abs = absolute(url);
      return {
        "@type": "ImageObject",
        contentUrl: abs,
        url: abs,
        thumbnailUrl: abs,
        name: `${ctx.title} — ${ctx.frameWord} ${n}`,
        caption: screenshotAlt(ctx, n),
        description: ctx.description ?? screenshotAlt(ctx, n),
        representativeOfPage: i === 0,
        creditText: SITE_NAME,
        copyrightNotice: SITE_NAME,
        isPartOf: { "@type": "VideoObject", name: ctx.title, "@id": ctx.pageUrl, url: ctx.pageUrl },
      };
    }),
  };
}
