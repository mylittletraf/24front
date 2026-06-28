"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { ActorCard } from "@/components/actor/actor-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SafeImage } from "@/components/ui/safe-image";
import { VideoCard } from "@/components/video/video-card";
import { VideoGrid } from "@/components/video/video-grid";
import { getSearchAll, getSearchType, getSearchTypeByUrl, type SearchType } from "@/lib/api/search";
import type { Actor, Tag, VideoCard as VideoCardData } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils/cn";

type Tab = "all" | SearchType;
const TABS: Tab[] = ["all", "videos", "tags", "categories", "studios", "actors"];

function TagChips({ items, kind }: { items: Tag[]; kind: "tag" | "category" }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((tag) => (
        <Chip key={tag.uuid} href={`/${kind}/${tag.slug}`}>
          {kind === "tag" ? `#${tag.name}` : tag.name}
        </Chip>
      ))}
    </div>
  );
}

function StudiosRow({ items }: { items: Tag[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
      {items.map((studio) => (
        <Link
          key={studio.uuid}
          href={`/studio/${studio.slug}`}
          className="group flex flex-col gap-2"
        >
          <div className="studio-plate relative aspect-square w-full overflow-hidden rounded-xl p-3">
            <SafeImage
              src={studio.preview_image}
              alt={studio.name}
              fill
              sizes="(max-width: 640px) 33vw, 16vw"
              loading="lazy"
              className="object-contain"
              fallback={
                <div className="grid h-full w-full place-items-center text-2xl font-semibold text-white/85">
                  {studio.name.charAt(0).toUpperCase()}
                </div>
              }
            />
          </div>
          <p className="truncate text-sm font-medium">{studio.name}</p>
        </Link>
      ))}
    </div>
  );
}

function ActorsRow({ items }: { items: Actor[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
      {items.map((actor) => (
        <ActorCard key={actor.uuid} actor={actor} />
      ))}
    </div>
  );
}

function VideosRow({ items }: { items: VideoCardData[] }) {
  if (items.length === 0) return null;
  return (
    <VideoGrid>
      {items.map((video) => (
        <VideoCard key={video.uuid} video={video} />
      ))}
    </VideoGrid>
  );
}

function AllResults({ q }: { q: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("search");
  const { data, isLoading } = useQuery({
    queryKey: ["search-all", q, locale],
    queryFn: () => getSearchAll(q, locale),
  });

  if (isLoading || !data) return null;
  const isEmpty =
    data.videos.length === 0 &&
    data.tags.length === 0 &&
    data.categories.length === 0 &&
    data.studios.length === 0 &&
    data.actors.length === 0;
  if (isEmpty) return <EmptyState title={t("noResultsFor", { query: q })} />;

  return (
    <div className="flex flex-col gap-6">
      {data.categories.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("tabs.categories")}</h2>
          <TagChips items={data.categories} kind="category" />
        </section>
      ) : null}
      {data.tags.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("tabs.tags")}</h2>
          <TagChips items={data.tags} kind="tag" />
        </section>
      ) : null}
      {data.studios.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("tabs.studios")}</h2>
          <StudiosRow items={data.studios} />
        </section>
      ) : null}
      {data.actors.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("tabs.actors")}</h2>
          <ActorsRow items={data.actors} />
        </section>
      ) : null}
      {data.videos.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("tabs.videos")}</h2>
          <VideosRow items={data.videos} />
        </section>
      ) : null}
    </div>
  );
}

function TypeResults({ type, q }: { type: SearchType; q: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["search", type, q, locale],
    queryFn: ({ pageParam }) =>
      pageParam ? getSearchTypeByUrl(type, pageParam) : getSearchType(type, q, locale),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });

  const items = data?.pages.flatMap((p) => p.results) ?? [];
  if (items.length === 0) return <EmptyState title={t("search.noResultsFor", { query: q })} />;

  return (
    <div className="flex flex-col gap-4">
      {type === "videos" ? <VideosRow items={items as VideoCardData[]} /> : null}
      {type === "actors" ? <ActorsRow items={items as Actor[]} /> : null}
      {type === "tags" ? <TagChips items={items as Tag[]} kind="tag" /> : null}
      {type === "categories" ? <TagChips items={items as Tag[]} kind="category" /> : null}
      {type === "studios" ? <StudiosRow items={items as Tag[]} /> : null}
      {hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {t("common.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SearchView({ q }: { q: string }) {
  const t = useTranslations("search");
  const [tab, setTab] = useState<Tab>("all");

  if (!q.trim()) {
    return <EmptyState title={t("nothingFound")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t("resultsFor", { query: q })}</h1>
      <div className="border-border no-scrollbar flex gap-1 overflow-x-auto border-b">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === value
                ? "border-accent text-foreground font-medium"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t(`tabs.${value}`)}
          </button>
        ))}
      </div>
      {tab === "all" ? <AllResults q={q} /> : <TypeResults type={tab} q={q} />}
    </div>
  );
}
