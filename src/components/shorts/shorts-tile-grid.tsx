"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getShortsFeed, type ShortsFeedParams } from "@/lib/api/shorts";
import { useAuth } from "@/lib/auth/auth-context";
import { ShortCard } from "./short-card";

type Scope = Pick<ShortsFeedParams, "categories" | "include_tags" | "actors">;

/**
 * Mobile Shorts block: a 2×4 tile grid (8 verticals). Shares the `["shorts-shelf", scopeKey]`
 * query cache with the desktop shelves. Tapping a tile deep-links into the shorts feed.
 * Renders nothing when there are no verticals.
 */
export function ShortsTileGrid({ scope = {} }: { scope?: Scope }) {
  const t = useTranslations("shorts");
  const { getToken } = useAuth();
  const scopeKey = JSON.stringify(scope);

  const { data } = useQuery({
    queryKey: ["shorts-shelf", scopeKey],
    queryFn: () => getShortsFeed({ page_size: 24, ...scope }, { token: getToken() }),
    staleTime: 60_000,
  });

  const items = (data?.results ?? []).slice(0, 8);
  if (!data || items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="heading-rail text-base font-semibold">{t("shelfTitle")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((s) => (
          <ShortCard key={s.uuid} short={s} />
        ))}
      </div>
    </section>
  );
}
