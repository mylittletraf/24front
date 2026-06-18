"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ActorCard } from "@/components/actor/actor-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { ActorCardSkeleton } from "@/components/ui/skeleton";
import { getActors, getActorsPageByUrl, type ActorListParams } from "@/lib/api/actors";
import type { Actor, PageNumberPage } from "@/lib/api/types";
import { useInView } from "@/lib/hooks/use-in-view";

export function ActorsGrid({
  queryKey,
  params,
  initialPage,
}: {
  queryKey: readonly unknown[];
  params: ActorListParams;
  initialPage: PageNumberPage<Actor>;
}) {
  const t = useTranslations();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => (pageParam ? getActorsPageByUrl(pageParam) : getActors(params)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
    initialData: { pages: [initialPage], pageParams: [null] },
  });

  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "1000px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  // Height/weight have no server-side range filter (FRONTEND_SPEC §8.1) — filter on the client.
  const inRange = (value: number | null | undefined, min?: number, max?: number) => {
    if (min === undefined && max === undefined) return true;
    if (value === null || value === undefined) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  };

  const actors = data.pages
    .flatMap((p) => p.results)
    .filter(
      (a) =>
        inRange(a.height, params.height_min, params.height_max) &&
        inRange(a.weight, params.weight_min, params.weight_max),
    );

  const isEmpty = actors.length === 0 && !isFetchingNextPage && !hasNextPage;

  return (
    <>
      {actors.length > 0 || isFetchingNextPage ? (
        <div className="desktop:grid-cols-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4">
          {actors.map((actor) => (
            <ActorCard key={actor.uuid} actor={actor} />
          ))}
          {isFetchingNextPage
            ? Array.from({ length: 5 }).map((_, i) => <ActorCardSkeleton key={`s-${i}`} />)
            : null}
        </div>
      ) : null}

      {isEmpty ? <EmptyState title={t("empty.title")} /> : null}

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
