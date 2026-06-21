import type { VideoCard as VideoCardData } from "@/lib/api/types";
import { VideoCard } from "./video-card";
import { VideoGrid } from "./video-grid";

/** Full-width video grid section below the player. */
export function VideoSection({ title, videos }: { title: string; videos: VideoCardData[] }) {
  if (videos.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="heading-rail text-lg font-semibold">{title}</h2>
      <VideoGrid>
        {videos.slice(0, 12).map((video) => (
          <VideoCard key={video.uuid} video={video} />
        ))}
      </VideoGrid>
    </section>
  );
}
