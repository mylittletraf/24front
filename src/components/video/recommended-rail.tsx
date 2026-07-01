"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { getVideoFeed } from "@/lib/api/videos";
import { useAuth } from "@/lib/auth/auth-context";
import type { Locale } from "@/lib/i18n/locales";
import { VideoCard } from "./video-card";

/**
 * Horizontal "Recommended" rail beside the player, fed by the ranked `/videos/recommended/` engine
 * (docs/RECOMMENDATIONS_FRONTEND_TASK.md §1). Personalized when logged in (JWT), trending for guests
 * — so it self-fetches on the client (server components can't read the in-memory token) and is not
 * cached (`staleTime: 0`, each visit is a fresh re-rank). One-shot batch: `?page=`/`?exclude` "show
 * more" is intentionally not wired here (would need a dedicated /recommendations page). Renders
 * nothing when the pool is empty.
 */
export function RecommendedRail({ lang }: { lang: Locale }) {
  const t = useTranslations("video");
  const { getToken } = useAuth();

  const { data } = useQuery({
    queryKey: ["recommended", lang],
    queryFn: () =>
      getVideoFeed("recommended", { lang, page_size: 20 }, { token: getToken() ?? undefined }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  const items = data?.results ?? [];
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="heading-rail text-lg font-semibold">{t("recommended")}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto sm:gap-4">
        {items.map((video) => (
          <VideoCard
            key={video.uuid}
            video={video}
            className="desktop:w-[300px] w-[70vw] shrink-0 sm:w-[280px]"
          />
        ))}
      </div>
    </section>
  );
}
