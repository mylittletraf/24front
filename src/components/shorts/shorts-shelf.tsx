"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
  const scopeKey = JSON.stringify(scope);

  const { data } = useQuery({
    queryKey: ["shorts-shelf", scopeKey],
    queryFn: () => getShortsFeed({ page_size: 48, ...scope }, { token: getToken() }),
    staleTime: 60_000,
  });

  const items = data?.results ?? [];
  if (!data || items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="heading-rail text-lg font-semibold">{title}</h2>
        <Link href={shortsHref(scope)} className="text-muted hover:text-foreground text-sm">
          {t("seeAll")}
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {items.map((s) => (
          <ShortCard
            key={s.uuid}
            short={s}
            className="desktop:w-[170px] w-[42vw] shrink-0 sm:w-[180px]"
          />
        ))}
      </div>
    </section>
  );
}
