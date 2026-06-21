"use client";

import { useTranslations } from "next-intl";
import type { CursorPage, VideoCard as VideoCardData } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { InfiniteVideoFeed } from "./infinite-video-feed";
import { VideoCard } from "./video-card";
import { VideoGrid } from "./video-grid";
import { VideoTabs, type TabItem } from "./video-tabs";

/**
 * Mobile-only "Похожее / Популярное" tabs under the player. Related is a flat list (the backend
 * endpoint isn't paginated); Popular is a cursor feed with a "Load more" button (+10 per click).
 */
export function MobileFeedTabs({
  related,
  popular,
  lang,
}: {
  related: VideoCardData[];
  popular: CursorPage<VideoCardData>;
  lang: Locale;
}) {
  const t = useTranslations("video");

  const items: TabItem[] = [];
  if (related.length > 0) {
    items.push({
      key: "related",
      label: t("relatedTab"),
      panel: (
        <VideoGrid>
          {related.map((video) => (
            <VideoCard key={video.uuid} video={video} />
          ))}
        </VideoGrid>
      ),
    });
  }
  items.push({
    key: "popular",
    label: t("popular"),
    panel: (
      <InfiniteVideoFeed
        queryKey={["videos", "popular", "mobile", lang]}
        endpoint="/videos/popular/"
        params={{ lang, page_size: 12 }}
        initialPage={popular}
        manual
        loadMorePageSize={10}
        emptyTitle={t("popular")}
      />
    ),
  });

  return <VideoTabs items={items} />;
}
