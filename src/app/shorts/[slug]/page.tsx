import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ShortsFeed } from "@/components/shorts/shorts-feed";
import { SITE_URL } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";
import { getSeo, seoToMetadata } from "@/lib/api/seo";
import { getRedirect, getVideoDetail } from "@/lib/api/video-detail";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

type PageParams = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

async function resolvePageLocale(searchParams: PageParams["searchParams"]): Promise<Locale> {
  const sp = await searchParams;
  return sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
}

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolvePageLocale(searchParams);
  const meta = seoToMetadata(await getSeo("video", slug, lang), "video.other");
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      videos: [{ url: `${SITE_URL}/embed/${slug}`, type: "text/html", width: 720, height: 1280 }],
    },
  };
}

export default async function ShortDeepLinkPage({ params, searchParams }: PageParams) {
  const { slug } = await params;
  const lang = await resolvePageLocale(searchParams);

  let detail;
  try {
    detail = await getVideoDetail(slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, "video", lang);
      redirect(r.redirect && r.new_slug ? `/shorts/${r.new_slug}` : "/shorts");
    }
    throw error;
  }

  // Only vertical videos belong in the shorts player — anything else falls back to the global feed.
  if (!detail.is_vertical) redirect("/shorts");

  return (
    <ShortsFeed
      lang={lang}
      initialVideo={{
        uuid: detail.uuid,
        slug: detail.slug,
        title: detail.title,
        poster: detail.poster,
        likes_count: detail.likes_count,
        dislikes_count: detail.dislikes_count,
        comments_count: detail.comments_count,
      }}
    />
  );
}
