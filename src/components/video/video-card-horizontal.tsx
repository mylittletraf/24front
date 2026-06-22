"use client";

import Link from "next/link";
import { Play, ThumbsUp } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { useLocale } from "next-intl";
import type { VideoCard as VideoCardData } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import {
  formatCount,
  formatDuration,
  formatRelativeDate,
  reactionRating,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { BookmarkButton } from "./bookmark-button";

/** Compact horizontal card for sidebars (UI_SPEC §3.3). */
export function VideoCardHorizontal({
  video,
  className,
}: {
  video: VideoCardData;
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const rating = reactionRating(video.likes_count, video.dislikes_count);
  return (
    <Link href={`/video/${video.slug}`} className={cn("group flex gap-3", className)}>
      <div className="bg-surface relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg">
        <SafeImage
          src={video.poster}
          alt={video.title}
          fill
          sizes="160px"
          loading="lazy"
          className="object-cover"
          fallback={
            <div className="text-muted absolute inset-0 grid place-items-center">
              <Play size={24} />
            </div>
          }
        />
        {rating !== null ? (
          <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded bg-black/80 px-1 py-0.5 text-[11px] text-white">
            <ThumbsUp size={10} />
            {rating}%
          </span>
        ) : null}
        <BookmarkButton uuid={video.uuid} className="absolute top-1 right-1 p-1" />
        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[11px] text-white">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium">{video.title}</h3>
        <span className="text-muted text-xs">
          {formatCount(video.views_count)} · {formatRelativeDate(video.published_at, locale)}
        </span>
      </div>
    </Link>
  );
}
