import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/video/player";
import { ApiError } from "@/lib/api/errors";
import { getVideoDetail } from "@/lib/api/video-detail";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 60;

// The embed is an iframe player for third parties (Yandex Video) — never index it directly.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type PageParams = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

/**
 * Bare video player for embedding in a third-party iframe (referenced from the watch page's
 * og:video). Site chrome/ads/analytics are stripped by the root layout for /embed. VAST here
 * uses the Yandex-only placements so it can be toggled independently of the on-site ads.
 */
export default async function EmbedPage({ params, searchParams }: PageParams) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);

  let detail;
  try {
    detail = await getVideoDetail(slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="grid min-h-dvh w-full place-items-center bg-black">
      <VideoPlayer
        uuid={detail.uuid}
        hls={detail.sources.hls}
        poster={detail.poster}
        vastPlacements={{ pre: "ya_vast_preroll", post: "ya_vast_postroll" }}
        clickunderSlot=""
      />
    </div>
  );
}
