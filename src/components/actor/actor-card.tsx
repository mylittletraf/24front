import Image from "next/image";
import Link from "next/link";
import type { Actor } from "@/lib/api/types";
import { formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const SIZES = "(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw";

export function ActorCard({ actor, className }: { actor: Actor; className?: string }) {
  return (
    <Link href={`/actor/${actor.slug}`} className={cn("group flex flex-col gap-2", className)}>
      <div className="bg-surface-2 relative aspect-[3/4] w-full overflow-hidden rounded-xl">
        {actor.photo ? (
          <Image
            src={actor.photo}
            alt={actor.name}
            fill
            sizes={SIZES}
            loading="lazy"
            className="object-cover"
          />
        ) : (
          <div className="text-muted absolute inset-0 grid place-items-center text-3xl font-semibold">
            {actor.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
          {formatCount(actor.videos_count)}
        </span>
      </div>
      <h3 className="truncate text-sm font-medium" title={actor.name}>
        {actor.name}
      </h3>
    </Link>
  );
}
