import Image from "next/image";
import Link from "next/link";
import type { RelatedActorItem } from "@/lib/api/related";
import { formatCount } from "@/lib/utils/format";

const SIZES = "(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw";

/** "Related actors" grid — internal linking between actor pages (actor ↔ actor crawl depth). */
export function RelatedActors({ title, actors }: { title: string; actors: RelatedActorItem[] }) {
  if (!actors.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="desktop:grid-cols-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {actors.map((a) => (
          <Link key={a.uuid} href={`/actor/${a.slug}`} className="group flex flex-col gap-2">
            <div className="bg-surface-2 relative aspect-[3/4] w-full overflow-hidden rounded-xl">
              {a.photo ? (
                <Image
                  src={a.photo}
                  alt={a.name}
                  fill
                  sizes={SIZES}
                  loading="lazy"
                  className="object-cover"
                />
              ) : (
                <div className="text-muted absolute inset-0 grid place-items-center text-2xl font-semibold">
                  {a.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                {formatCount(a.videos_count)}
              </span>
            </div>
            <h3 className="truncate text-sm font-medium" title={a.name}>
              {a.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
