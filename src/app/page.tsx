import { getLocale } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import type { QueryValue } from "@/lib/api/fetcher";
import { getVideos } from "@/lib/api/videos";

export const revalidate = 60;

export default async function HomePage() {
  const locale = await getLocale();
  const params: Record<string, QueryValue> = { lang: locale, sort: "newest", page_size: 24 };
  const initialPage = await getVideos(params, { revalidate: 60 });

  return (
    <Container className="desktop:py-6 py-4">
      <InfiniteVideoFeed
        queryKey={["videos", "home", locale]}
        params={params}
        initialPage={initialPage}
      />
    </Container>
  );
}
