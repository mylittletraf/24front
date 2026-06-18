"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { VideoCardSkeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { VideoGrid } from "@/components/video/video-grid";
import { getFeed, subscriptionToFilters } from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { filtersToSearchString } from "@/lib/filters";
import type { Locale } from "@/lib/i18n/locales";

const BUCKETS = ["today", "last_week", "last_month", "prev_month", "3_months"] as const;
const isKnownBucket = (label: string): label is (typeof BUCKETS)[number] =>
  (BUCKETS as readonly string[]).includes(label);

export function FeedList() {
  const t = useTranslations("feed");
  const locale = useLocale() as Locale;
  const { getToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["feed", locale],
    queryFn: () => {
      const token = getToken();
      return token ? getFeed(token, locale) : { buckets: [] };
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (isLoading) {
    return (
      <VideoGrid>
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </VideoGrid>
    );
  }

  const buckets = data?.buckets ?? [];
  if (buckets.length === 0) {
    return <EmptyState title={t("emptyNothingNew")} description={t("emptyNoSubs")} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {buckets.map((bucket) => (
        <section key={bucket.label} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            {isKnownBucket(bucket.label) ? t(`bucket.${bucket.label}`) : bucket.label}
          </h2>
          {bucket.groups.map((group) => {
            const filters = subscriptionToFilters(group.subscription);
            const href = `/${filtersToSearchString({
              ...filters,
              published_after: bucket.date_from,
              published_before: bucket.date_to,
            })}`;
            return (
              <div key={group.subscription.uuid} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-surface rounded-full px-3 py-1 text-sm font-medium">
                    {group.subscription.name}
                  </span>
                  {group.total > group.videos.length ? (
                    <Link href={href} className="text-link text-sm hover:underline">
                      {t("showAll", { count: group.total })}
                    </Link>
                  ) : null}
                </div>
                <VideoGrid>
                  {group.videos.map((video) => (
                    <VideoCard key={video.uuid} video={video} />
                  ))}
                </VideoGrid>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
