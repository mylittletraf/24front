import type { VideoShort } from "@/lib/api/shorts";
import { ShortCard } from "./short-card";

/**
 * Catalog-style grid of vertical Shorts. Each card opens the fullscreen player by linking to
 * `/shorts/<slug>` (see {@link ShortCard}) — the same deep-link the shelves use — so the grid is a
 * browse surface while playback stays in the existing fullscreen feed.
 */
export function ShortsGrid({ shorts }: { shorts: VideoShort[] }) {
  return (
    <div className="wide:grid-cols-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {shorts.map((s) => (
        <ShortCard key={s.uuid} short={s} />
      ))}
    </div>
  );
}
