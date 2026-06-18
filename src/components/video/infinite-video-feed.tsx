"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { QueryValue } from "@/lib/api/fetcher";
import { getVideoPageByUrl, getVideos } from "@/lib/api/videos";
import type { CursorPage, VideoCard as VideoCardData } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { VideoCardSkeleton } from "@/components/ui/skeleton";
import { useInView } from "@/lib/hooks/use-in-view";
import { VideoCard } from "./video-card";
import { VideoGrid } from "./video-grid";

export function InfiniteVideoFeed({
  queryKey,
  params,
  initialPage,
  priorityCount = 4,
  emptyTitle,
}: {
  queryKey: readonly unknown[];
  params: Record<string, QueryValue>;
  initialPage: CursorPage<VideoCardData>;
  priorityCount?: number;
  emptyTitle?: string;
}) {
  const t = useTranslations();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => (pageParam ? getVideoPageByUrl(pageParam) : getVideos(params)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  // Prefetch the next page once the sentinel approaches (~1.5 screens early).
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "1200px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const videos = data.pages.flatMap((p) => p.results);

  if (videos.length === 0) {
    return <EmptyState title={emptyTitle ?? t("empty.title")} />;
  }

  return (
    <>
      <VideoGrid>
        {videos.map((video, i) => (
          <VideoCard key={video.uuid} video={video} priority={i < priorityCount} />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`s-${i}`} />)
          : null}
      </VideoGrid>

      <div ref={ref} className="h-px w-full" />

      {isError && hasNextPage ? (
        <div className="flex justify-center py-6">
          <Button variant="secondary" onClick={() => fetchNextPage()}>
            {t("common.loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
