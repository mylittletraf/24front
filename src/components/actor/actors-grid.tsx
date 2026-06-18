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

  const actors = data.pages.flatMap((p) => p.results);
  if (actors.length === 0) return <EmptyState title={t("empty.title")} />;

  return (
    <>
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 xl:grid-cols-5">
        {actors.map((actor) => (
          <ActorCard key={actor.uuid} actor={actor} />
        ))}
        {isFetchingNextPage
          ? Array.from({ length: 5 }).map((_, i) => <ActorCardSkeleton key={`s-${i}`} />)
          : null}
      </div>
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
