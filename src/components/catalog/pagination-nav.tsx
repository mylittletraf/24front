import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageHref } from "@/lib/api/pagination";
import { cn } from "@/lib/utils/cn";

/**
 * Classic numbered pagination (`‹ Prev 1 … 4 [5] 6 … 42 Next ›`) for the `/videos/`-backed
 * listings (home + tag/category/studio). Server-rendered real <a href="?page=N"> anchors, so they
 * double as a crawl path through the whole catalog. Returns null for single-page result sets.
 */
export async function PaginationNav({
  basePath,
  searchParams,
  page,
  count,
  pageSize,
}: {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** Current 1-based page. */
  page: number;
  /** Total matching videos (from the page-number response `count`). */
  count: number;
  pageSize: number;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(page, 1), totalPages);

  const t = await getTranslations("common");

  // Windowed list: first, last, current ±1; collapse the gaps into ellipses.
  const shown = new Set<number>();
  for (const n of [1, totalPages, current - 1, current, current + 1]) {
    if (n >= 1 && n <= totalPages) shown.add(n);
  }
  const numbers = [...shown].sort((a, b) => a - b);
  const items: ("…" | number)[] = [];
  let prev = 0;
  for (const n of numbers) {
    if (n - prev > 1) items.push("…");
    items.push(n);
    prev = n;
  }

  const arrowCls =
    "border-border bg-surface hover:bg-surface-2 inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium transition-colors";
  const numCls =
    "border-border bg-surface hover:bg-surface-2 inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors";
  const activeCls = "bg-accent text-on-accent border-accent hover:bg-accent";

  return (
    <nav
      aria-label={t("pagination")}
      className="mt-2 flex flex-wrap items-center justify-center gap-1.5"
    >
      {current > 1 ? (
        <Link
          rel="prev"
          prefetch={false}
          href={pageHref(basePath, searchParams, current - 1)}
          aria-label={t("previousPage")}
          className={arrowCls}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrowCls, "cursor-default opacity-40")}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {items.map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="text-muted px-1 text-sm" aria-hidden>
            …
          </span>
        ) : item === current ? (
          <span key={item} aria-current="page" className={cn(numCls, activeCls)}>
            {item}
          </span>
        ) : (
          <Link
            key={item}
            prefetch={false}
            href={pageHref(basePath, searchParams, item)}
            aria-label={t("goToPage", { n: item })}
            className={numCls}
          >
            {item}
          </Link>
        ),
      )}

      {current < totalPages ? (
        <Link
          rel="next"
          prefetch={false}
          href={pageHref(basePath, searchParams, current + 1)}
          aria-label={t("nextPage")}
          className={arrowCls}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrowCls, "cursor-default opacity-40")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
