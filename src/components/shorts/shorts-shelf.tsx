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
 * feed and renders all of it in a single full-width, horizontally-scrollable rail. Renders nothing
 * when there are no verticals.
 */
export function ShortsShelf({ scope = {}, title }: { scope?: Scope; title: string }) {
  const t = useTranslations("shorts");
  const { getToken } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);
  const scopeKey = JSON.stringify(scope);

  const { data } = useQuery({
    queryKey: ["shorts-shelf", scopeKey],
    queryFn: () => getShortsFeed({ page_size: 48, ...scope }, { token: getToken() }),
    staleTime: 60_000,
  });

  const items = data?.results ?? [];
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
      <div className="group/shelf relative">
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
          className="from-surface/95 via-surface/80 text-foreground desktop:flex hover:via-surface absolute inset-y-0 left-0 z-10 hidden w-14 items-center justify-start rounded-l-xl bg-gradient-to-r to-transparent pl-1 opacity-0 transition group-hover/shelf:opacity-100"
        >
          <span className="bg-surface/90 border-border grid h-10 w-10 place-items-center rounded-full border shadow">
            <ChevronLeft size={22} />
          </span>
        </button>
        <button
          type="button"
          aria-label={t("scrollNext")}
          onClick={() => scrollBy(1)}
          className="from-surface/95 via-surface/80 text-foreground desktop:flex hover:via-surface absolute inset-y-0 right-0 z-10 hidden w-14 items-center justify-end rounded-r-xl bg-gradient-to-l to-transparent pr-1 opacity-0 transition group-hover/shelf:opacity-100"
        >
          <span className="bg-surface/90 border-border grid h-10 w-10 place-items-center rounded-full border shadow">
            <ChevronRight size={22} />
          </span>
        </button>
      </div>
    </section>
  );
}
