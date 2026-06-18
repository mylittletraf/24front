"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { useLocale } from "next-intl";
import type { VideoCard as VideoCardData } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { formatCount, formatDuration, formatRelativeDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Compact horizontal card for sidebars (UI_SPEC §3.3). */
export function VideoCardHorizontal({
  video,
  className,
}: {
  video: VideoCardData;
  className?: string;
}) {
  const locale = useLocale() as Locale;
  return (
    <Link href={`/video/${video.slug}`} className={cn("group flex gap-3", className)}>
      <div className="bg-surface relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg">
        {video.poster ? (
          <Image
            src={video.poster}
            alt={video.title}
            fill
            sizes="160px"
            loading="lazy"
            className="object-cover"
          />
        ) : (
          <div className="text-muted absolute inset-0 grid place-items-center">
            <Play size={24} />
          </div>
        )}
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
