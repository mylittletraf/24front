import { getTranslations } from "next-intl/server";
import type { VideoCard as VideoCardData } from "@/lib/api/types";
import { VideoCardHorizontal } from "./video-card-horizontal";

export async function PopularSidebar({ videos }: { videos: VideoCardData[] }) {
  const t = await getTranslations("video");
  if (videos.length === 0) return null;
  return (
    <aside className="desktop:flex hidden w-[360px] shrink-0 flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("popular")}</h2>
      {videos.slice(0, 5).map((video) => (
        <VideoCardHorizontal key={video.uuid} video={video} />
      ))}
    </aside>
  );
}
