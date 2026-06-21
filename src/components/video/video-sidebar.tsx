import type { VideoCard as VideoCardData } from "@/lib/api/types";
import { VideoCard } from "./video-card";

/** Desktop-only sidebar list: videos stacked one per row as full-width cards. */
export function VideoSidebar({ title, videos }: { title: string; videos: VideoCardData[] }) {
  if (videos.length === 0) return null;
  return (
    <aside className="desktop:flex hidden w-[360px] shrink-0 flex-col gap-y-5">
      <h2 className="heading-rail text-lg font-semibold">{title}</h2>
      {videos.slice(0, 5).map((video) => (
        <VideoCard key={video.uuid} video={video} />
      ))}
    </aside>
  );
}
