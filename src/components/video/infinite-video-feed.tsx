"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Fragment, useEffect } from "react";
import { AdSlotRender } from "@/components/ads/ad-slot-render";
import { ShortsShelf } from "@/components/shorts/shorts-shelf";
import { useShortsPref } from "@/components/shorts/shorts-pref";
import { ShortsTileGrid } from "@/components/shorts/shorts-tile-grid";
import type { QueryValue } from "@/lib/api/fetcher";
import { getVideoList, getVideoPageByUrl } from "@/lib/api/videos";
import type { CursorPage, VideoCard as VideoCardData } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { VideoCardSkeleton } from "@/components/ui/skeleton";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { useInView } from "@/lib/hooks/use-in-view";
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { VideoCard } from "./video-card";
import { VideoGrid } from "./video-grid";

const NATIVE_EVERY = 15;

/** Override the `page_size` baked into a cursor `next` URL (initial page can be larger). */
function withPageSize(url: string, size?: number): string {
  if (!size) return url;
  try {
    const u = new URL(url, "http://_");
    u.searchParams.set("page_size", String(size));
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export function InfiniteVideoFeed({
  queryKey,
  endpoint = "/videos/",
  params,
  initialPage,
  priorityCount = 4,
  emptyTitle,
  manual = false,
  paged = false,
  loadMorePageSize,
  interleaveShorts = false,
  shortsScope,
}: {
  queryKey: readonly unknown[];
  endpoint?: string;
  params: Record<string, QueryValue>;
  initialPage: CursorPage<VideoCardData>;
  priorityCount?: number;
  emptyTitle?: string;
  /** Replace auto infinite-scroll with an explicit "Load more" button. */
  manual?: boolean;
  /** Classic numbered pagination: render only this page (no infinite scroll / no "Load more"). */
  paged?: boolean;
  /** page_size for button-triggered loads (the initial page may have loaded more). */
  loadMorePageSize?: number;
  /** Interleave Shorts (desktop shelves after rows 2 & 4, mobile 2×4 tiles after 8). */
  interleaveShorts?: boolean;
  /** Scope the interleaved Shorts (e.g. by category/tag) — same CSV-slug filters as the catalog. */
  shortsScope?: { categories?: string; include_tags?: string; actors?: string };
}) {
  const t = useTranslations();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      pageParam
        ? getVideoPageByUrl(withPageSize(pageParam, loadMorePageSize))
        : getVideoList(endpoint, params),
    initialPageParam: null as string | null,
    // In paged mode the numbered pager drives navigation, so never expose a next page here.
    getNextPageParam: (last) => (paged ? undefined : last.next),
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  // Auto infinite-scroll: prefetch the next page as the sentinel approaches. Skipped in manual mode.
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "1200px" });
  useEffect(() => {
    if (manual) return;
    if (inView && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [manual, inView, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const videos = data.pages.flatMap((p) => p.results);

  // Native ad block every 15 cards — mobile only.
  const nativeSlot = useAdSlot("native_in_video_feed");
  const mounted = useMounted();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  // Desktop column count tracks VideoGrid (md=3 / xl=4 / wide=5) so shelves land on a full row.
  const isWide = useMediaQuery("(min-width: 1440px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const desktopCols = isWide ? 5 : isXl ? 4 : 3;
  const showNative = mounted && isMobile && !!nativeSlot;
  const { show: showShorts } = useShortsPref();

  // Shorts interleave (home only): desktop shelves after rows 2 & 4, mobile a 2×4 tile block after 8.
  // The shelf is `col-span-full`, so the row before it must be complete (a multiple of the column
  // count) — otherwise it breaks mid-row and the grid looks ragged. Hence the row-based indices.
  function shortsAt(i: number) {
    if (!interleaveShorts || !showShorts || !mounted) return null;
    if (isMobile) {
      return i === 7 ? (
        <div className="col-span-full">
          <ShortsTileGrid scope={shortsScope} />
        </div>
      ) : null;
    }
    const afterRow2 = 2 * desktopCols - 1;
    const afterRow4 = 4 * desktopCols - 1;
    if (i === afterRow2 || i === afterRow4) {
      return (
        <div className="col-span-full">
          <ShortsShelf
            title={t("shorts.shelfTitle")}
            scope={shortsScope}
            skip={i === afterRow2 ? 0 : 12}
            take={12}
          />
        </div>
      );
    }
    return null;
  }

  if (videos.length === 0) {
    return <EmptyState title={emptyTitle ?? t("empty.title")} />;
  }

  return (
    <>
      <VideoGrid>
        {videos.map((video, i) => (
          <Fragment key={video.uuid}>
            <VideoCard video={video} priority={i < priorityCount} />
            {showNative && (i + 1) % NATIVE_EVERY === 0 ? (
              <AdSlotRender slot={nativeSlot!} className="col-span-full" />
            ) : null}
            {shortsAt(i)}
          </Fragment>
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`s-${i}`} />)
          : null}
      </VideoGrid>

      {!manual && !paged ? <div ref={ref} className="h-px w-full" /> : null}

      {(manual || isError) && hasNextPage ? (
        <div className="flex justify-center py-6">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {t("common.loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
