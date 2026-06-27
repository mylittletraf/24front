"use client";

import Link from "next/link";
import { Eye, Pause, Play, ThumbsUp } from "lucide-react";
import { useClickunder } from "@/components/ads/use-clickunder";
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
  const { ref, playing, hasHover, showControl, tapPlaying, toggle, onMouseEnter, onMouseLeave } =
    useTrailer(hasTrailer);
  const rating = reactionRating(video.likes_count, video.dislikes_count);
  const fireClickunder = useClickunder();

  return (
    <Link
      href={`/video/${video.slug}`}
      onClick={fireClickunder}
      className={cn("group flex flex-col gap-2", className)}
    >
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="card-glow bg-surface relative aspect-video w-full overflow-hidden rounded-xl"
      >
        <SafeImage
          src={video.poster}
          alt={video.title}
          fill
          sizes={THUMB_SIZES}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className="object-cover"
          fallback={
            <div className="text-muted absolute inset-0 grid place-items-center">
              <Play size={32} />
            </div>
          }
        />

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

        {/* Touch devices: deliberate tap-to-preview. Small icon, generous (44px) hit area at the
            corner so it's easy to hit with a thumb without triggering the card link. */}
        {showControl ? (
          <button
            type="button"
            aria-label={tapPlaying ? "Stop preview" : "Play preview"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle();
            }}
            className="absolute top-0 left-0 z-10 grid h-11 w-11 place-items-center"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white">
              {tapPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </span>
          </button>
        ) : null}

        {rating !== null ? (
          <span
            className={cn(
              "absolute top-1.5 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white",
              showControl ? "left-12" : "left-1.5",
            )}
          >
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
