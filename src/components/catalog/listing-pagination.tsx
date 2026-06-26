import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cursorFromUrl, paginatedHref } from "@/lib/api/pagination";

/**
 * Server-rendered, always-in-DOM prev/next pagination for cursor feeds.
 *
 * Why it exists: the listings load more via client-side infinite scroll, which crawlers don't
 * trigger reliably and which produces no followable URLs. These real <a href="?cursor=…"> links
 * give Googlebot/Yandex a sequential path through the whole catalog to discover every /video/…
 * URL — critical while there is no sitemap yet. The links are kept in the DOM (not hidden behind
 * <noscript>) so the rendered crawl finds them too; `rel="prev"/"next"` is a mild ordering hint.
 *
 * Cursor pages canonicalize to the clean base URL (see each page's metadata), so these act as a
 * crawl/discovery path rather than indexable duplicates.
 */
export async function ListingPagination({
  basePath,
  searchParams,
  prev,
  next,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Proxied `previous` URL from the cursor page (null on the first page). */
  prev: string | null;
  /** Proxied `next` URL from the cursor page (null on the last page). */
  next: string | null;
}) {
  const prevCursor = cursorFromUrl(prev);
  const nextCursor = cursorFromUrl(next);
  if (!prevCursor && !nextCursor) return null;

  const t = await getTranslations("common");
  const linkCls =
    "border-border bg-surface hover:bg-surface-2 inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors";

  return (
    <nav aria-label={t("pagination")} className="mt-2 flex items-center justify-between gap-3">
      {prevCursor ? (
        <Link
          rel="prev"
          prefetch={false}
          href={paginatedHref(basePath, searchParams, prevCursor)}
          className={linkCls}
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("newerVideos")}
        </Link>
      ) : (
        <span />
      )}
      {nextCursor ? (
        <Link
          rel="next"
          prefetch={false}
          href={paginatedHref(basePath, searchParams, nextCursor)}
          className={linkCls}
        >
          {t("olderVideos")}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
