/**
 * Helpers for turning a DRF cursor-pagination `next`/`previous` link into a crawlable
 * URL on our own domain.
 *
 * The public video feed uses `CursorPagination` (opaque `?cursor=` tokens, no page numbers),
 * so deep pagination can only be walked sequentially. To make that walk visible to crawlers
 * (Google recommends real <a> links for infinite-scroll feeds), we surface the cursor token as
 * a `?cursor=` param on the listing page itself and render prev/next anchors with it.
 *
 * The catalog also supports classic numbered pagination (`?page=N`) — see `pageHref` /
 * `pagedMetadata` below.
 */

import type { Metadata } from "next";

/** The query params we treat as pagination state (stripped before re-applying a new one). */
export const PAGINATION_PARAMS = ["cursor", "page"] as const;

/** Pull the opaque `cursor` token out of a proxied next/previous URL (null when absent). */
export function cursorFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    // The URL is a proxy *path* (e.g. /api/proxy/videos/?cursor=…); a dummy base makes it parseable.
    return new URL(url, "http://_").searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** Read the active cursor from this page's own search params (string form only). */
export function cursorFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string | undefined {
  return typeof sp.cursor === "string" && sp.cursor ? sp.cursor : undefined;
}

/** Read the active 1-based page number from this page's own search params (floors at 1). */
export function pageFromSearchParams(sp: Record<string, string | string[] | undefined>): number {
  const raw = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : NaN;
  return Number.isFinite(raw) && raw > 1 ? raw : 1;
}

/**
 * Build a listing URL that preserves every existing search param (refine filters, sort, lang)
 * except pagination, then applies the given 1-based page. Page 1 yields the clean (page-less) URL.
 */
export function pageHref(
  basePath: string,
  sp: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if ((PAGINATION_PARAMS as readonly string[]).includes(key)) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v != null) params.append(key, v);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Apply the paginated-listing SEO rule to base metadata: pages ≥2 become `noindex, follow`
 * with a self canonical (`<canonicalBase>?page=N`), so bots crawl the deep pages but only page 1
 * is indexed. Page 1 (and page-less URLs) is returned unchanged.
 */
export function pagedMetadata(
  base: Metadata,
  canonicalBase: string,
  sp: Record<string, string | string[] | undefined>,
): Metadata {
  const page = pageFromSearchParams(sp);
  if (page <= 1) return base;
  return {
    ...base,
    robots: { index: false, follow: true },
    alternates: { ...base.alternates, canonical: `${canonicalBase}?page=${page}` },
  };
}

/**
 * Build a listing URL that preserves every existing search param (refine filters, sort, lang)
 * except pagination, then applies the given cursor. A null cursor yields the clean first-page URL.
 */
export function paginatedHref(
  basePath: string,
  sp: Record<string, string | string[] | undefined>,
  cursor: string | null,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if ((PAGINATION_PARAMS as readonly string[]).includes(key)) continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v != null) params.append(key, v);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
