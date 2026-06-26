/**
 * Helpers for turning a DRF cursor-pagination `next`/`previous` link into a crawlable
 * URL on our own domain.
 *
 * The public video feed uses `CursorPagination` (opaque `?cursor=` tokens, no page numbers),
 * so deep pagination can only be walked sequentially. To make that walk visible to crawlers
 * (Google recommends real <a> links for infinite-scroll feeds), we surface the cursor token as
 * a `?cursor=` param on the listing page itself and render prev/next anchors with it.
 */

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
