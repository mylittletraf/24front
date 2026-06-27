"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef } from "react";
import { getShortsFeed, type ShortsFeedParams } from "@/lib/api/shorts";
import { useAuth } from "@/lib/auth/auth-context";
import { ShortCard } from "./short-card";

type Scope = Pick<ShortsFeedParams, "categories" | "include_tags" | "actors">;

function shortsHref(scope: Scope): string {
  const qs = new URLSearchParams(
    Object.entries(scope).filter(([, v]) => v) as [string, string][],
  ).toString();
  return qs ? `/shorts?${qs}` : "/shorts";
}

/**
 * Horizontal Shorts carousel (YouTube-style shelf). Fetches one page of the personalized shorts
 * feed and slices [skip, skip+take) — two home shelves share the cache (`scopeKey`) and show
 * different items from one fetch. Renders nothing when there are no verticals.
 */
export function ShortsShelf({
  scope = {},
  title,
  skip = 0,
  take = 12,
}: {
  scope?: Scope;
  title: string;
  skip?: number;
  take?: number;
}) {
  const t = useTranslations("shorts");
  const { getToken } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);
  const scopeKey = JSON.stringify(scope);

  const { data } = useQuery({
    queryKey: ["shorts-shelf", scopeKey],
    queryFn: () => getShortsFeed({ page_size: 24, ...scope }, { token: getToken() }),
    staleTime: 60_000,
  });

  const items = (data?.results ?? []).slice(skip, skip + take);
  if (!data || items.length === 0) return null;

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="heading-rail text-lg font-semibold">{title}</h2>
        <Link href={shortsHref(scope)} className="text-muted hover:text-foreground text-sm">
          {t("seeAll")}
        </Link>
      </div>
      <div className="relative">
        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth"
        >
          {items.map((s) => (
            <ShortCard
              key={s.uuid}
              short={s}
              className="desktop:w-[170px] w-[42vw] shrink-0 snap-start sm:w-[180px]"
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={t("scrollPrev")}
          onClick={() => scrollBy(-1)}
          className="bg-surface/90 text-foreground hover:bg-surface desktop:grid border-border absolute top-[34%] left-1 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border shadow"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label={t("scrollNext")}
          onClick={() => scrollBy(1)}
          className="bg-surface/90 text-foreground hover:bg-surface desktop:grid border-border absolute top-[34%] right-1 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border shadow"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
