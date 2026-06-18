import { getTranslations } from "next-intl/server";
import type { VideoCard as VideoCardData } from "@/lib/api/types";
import { VideoCard } from "./video-card";
import { VideoGrid } from "./video-grid";

export async function RelatedVideos({ videos }: { videos: VideoCardData[] }) {
  const t = await getTranslations("video");
  if (videos.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("related")}</h2>
      <VideoGrid>
        {videos.slice(0, 12).map((video) => (
          <VideoCard key={video.uuid} video={video} />
        ))}
      </VideoGrid>
    </section>
  );
}
