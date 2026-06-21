"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Play, ThumbsUp } from "lucide-react";
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
import { useTrailer } from "./use-trailer";

const THUMB_SIZES = "(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw";

export function VideoCard({
  video,
  priority = false,
  className,
}: {
  video: VideoCardData;
  priority?: boolean;
  className?: string;
}) {
  const locale = useLocale() as Locale;
  const hasTrailer = Boolean(video.trailer);
  const { ref, playing, hasHover, onMouseEnter, onMouseLeave } = useTrailer(hasTrailer);
  const rating = reactionRating(video.likes_count, video.dislikes_count);

  return (
    <Link href={`/video/${video.slug}`} className={cn("group flex flex-col gap-2", className)}>
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="card-glow bg-surface relative aspect-video w-full overflow-hidden rounded-xl"
      >
        {video.poster ? (
          <Image
            src={video.poster}
            alt={video.title}
            fill
            sizes={THUMB_SIZES}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover"
          />
        ) : (
          <div className="text-muted absolute inset-0 grid place-items-center">
            <Play size={32} />
          </div>
        )}

        {hasTrailer && playing ? (
          <video
            src={video.trailer ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload={hasHover ? "none" : "metadata"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {rating !== null ? (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
            <ThumbsUp size={12} />
            {rating}%
          </span>
        ) : null}
        <BookmarkButton uuid={video.uuid} className="absolute top-1.5 right-1.5" />

        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
          <Eye size={12} />
          {formatCount(video.views_count)}
        </span>
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
          {formatDuration(video.duration)}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="truncate text-sm font-medium" title={video.title}>
          {video.title}
        </h3>
        <span className="text-muted text-xs">{formatRelativeDate(video.published_at, locale)}</span>
      </div>
    </Link>
  );
}
