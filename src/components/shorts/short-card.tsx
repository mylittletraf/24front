"use client";

import { Eye, Pause, Play } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { useTrailer } from "@/components/video/use-trailer";
import type { VideoCard } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatCount, formatDuration } from "@/lib/utils/format";

/** A vertical 9:16 poster tile linking into the shorts feed (shelves + mobile tile grid). */
export function ShortCard({ short, className }: { short: VideoCard; className?: string }) {
  const hasTrailer = Boolean(short.trailer);
  const { ref, playing, showControl, tapPlaying, toggle, onMouseEnter, onMouseLeave } =
    useTrailer(hasTrailer);

  return (
    <Link href={`/shorts/${short.slug}`} className={cn("group block", className)}>
      <div
        ref={ref}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="bg-surface relative aspect-[9/16] overflow-hidden rounded-xl"
      >
        <SafeImage
          src={short.poster}
          alt={short.title}
          fill
          sizes="(max-width: 1023px) 45vw, 180px"
          className="object-cover transition group-hover:scale-105"
          fallback={
            <div className="bg-surface-2 text-muted grid h-full w-full place-items-center">
              <Play size={28} />
            </div>
          }
        />

        {hasTrailer && playing ? (
          <video
            src={short.trailer ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          <Eye size={11} />
          {formatCount(short.views_count)}
        </span>
        {short.duration ? (
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(short.duration)}
          </span>
        ) : null}

        {/* Touch devices: deliberate tap-to-preview (desktop uses hover). */}
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
        ) : playing ? null : (
          <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
              <Play size={22} fill="currentColor" />
            </span>
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium">{short.title}</p>
    </Link>
  );
}
