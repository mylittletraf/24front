"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { VideoCardSkeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { VideoGrid } from "@/components/video/video-grid";
import { getMeVideoFeed, getMeVideoPageByUrl } from "@/lib/api/me-feeds";
import type { PageNumberPage, VideoCard as VideoCardData } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useInView } from "@/lib/hooks/use-in-view";

const EMPTY: PageNumberPage<VideoCardData> = { count: 0, next: null, previous: null, results: [] };

export function MeVideoFeed({ path, emptyTitle }: { path: string; emptyTitle: string }) {
  const t = useTranslations("common");
  const { getToken } = useAuth();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ["me-feed", path],
      queryFn: ({ pageParam }) => {
        const token = getToken();
        if (!token) return EMPTY;
        return pageParam ? getMeVideoPageByUrl(pageParam, token) : getMeVideoFeed(path, token);
      },
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.next,
      // Private feed — always refetch on mount so it reflects recent favorites/likes/history.
      staleTime: 0,
      refetchOnMount: "always",
    });

  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "1000px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const videos = data?.pages.flatMap((p) => p.results) ?? [];

  if (isLoading) {
    return (
      <VideoGrid>
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </VideoGrid>
    );
  }

  if (videos.length === 0) return <EmptyState title={emptyTitle} />;

  return (
    <>
      <VideoGrid>
        {videos.map((video) => (
          <VideoCard key={video.uuid} video={video} />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 4 }).map((_, i) => <VideoCardSkeleton key={`s-${i}`} />)
          : null}
      </VideoGrid>
      <div ref={ref} className="h-px w-full" />
      {isError && hasNextPage ? (
        <div className="flex justify-center py-6">
          <Button variant="secondary" onClick={() => fetchNextPage()}>
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}
