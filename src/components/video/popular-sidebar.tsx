import { getTranslations } from "next-intl/server";
import type { VideoCard as VideoCardData } from "@/lib/api/types";
import { VideoCard } from "./video-card";

export async function PopularSidebar({ videos }: { videos: VideoCardData[] }) {
  const t = await getTranslations("video");
  if (videos.length === 0) return null;
  return (
    <aside className="desktop:flex hidden w-[360px] shrink-0 flex-col gap-y-5">
      <h2 className="text-lg font-semibold">{t("popular")}</h2>
      {videos.slice(0, 5).map((video) => (
        <VideoCard key={video.uuid} video={video} />
      ))}
    </aside>
  );
}
