import { Eye, Play } from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import type { VideoCard } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatCount, formatDuration } from "@/lib/utils/format";

/** A vertical 9:16 poster tile linking into the shorts feed (shelves + mobile tile grid). */
export function ShortCard({ short, className }: { short: VideoCard; className?: string }) {
  return (
    <Link href={`/shorts/${short.slug}`} className={cn("group block", className)}>
      <div className="bg-surface relative aspect-[9/16] overflow-hidden rounded-xl">
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
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          <Eye size={11} />
          {formatCount(short.views_count)}
        </span>
        {short.duration ? (
          <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
            {formatDuration(short.duration)}
          </span>
        ) : null}
        <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play size={22} fill="currentColor" />
          </span>
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs font-medium">{short.title}</p>
    </Link>
  );
}
