import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment } from "react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Chip } from "@/components/ui/chip";
import { CommentsSection } from "@/components/video/comments";
import { Description } from "@/components/video/description";
import { PopularSidebar } from "@/components/video/popular-sidebar";
import { VideoPlayer } from "@/components/video/player";
import { RelatedVideos } from "@/components/video/related-videos";
import { ReportModal } from "@/components/video/report-modal";
import { VideoActions } from "@/components/video/video-actions";
import { ApiError } from "@/lib/api/errors";
import { getSeo, seoToMetadata } from "@/lib/api/seo";
import { getVideoFeed } from "@/lib/api/videos";
import {
  getNextVideo,
  getRedirect,
  getRelatedVideos,
  getVideoDetail,
} from "@/lib/api/video-detail";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { formatCount, formatRelativeDate } from "@/lib/utils/format";

export const revalidate = 60;

type PageParams = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

async function resolvePageLocale(searchParams: PageParams["searchParams"]): Promise<Locale> {
  const sp = await searchParams;
  return sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
}

export async function generateMetadata({ params, searchParams }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const lang = await resolvePageLocale(searchParams);
  return seoToMetadata(await getSeo("video", slug, lang));
}

export default async function VideoPage({ params, searchParams }: PageParams) {
  const { slug } = await params;
  const lang = await resolvePageLocale(searchParams);
  const t = await getTranslations("video");

  let detail;
  try {
    detail = await getVideoDetail(slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, "video", lang);
      if (r.redirect && r.new_slug) redirect(`/video/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  const [related, , popular, seo] = await Promise.all([
    getRelatedVideos(slug, lang),
    getNextVideo(slug, lang),
    getVideoFeed("popular", { lang, page_size: 5 }),
    getSeo("video", slug, lang),
  ]);

  return (
    <Container className="desktop:py-6 py-4">
      <JsonLd data={seo?.json_ld} />
      <div className="desktop:flex-row flex flex-col gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <VideoPlayer uuid={detail.uuid} hls={detail.sources.hls} poster={detail.poster} />

          <h1 className="text-xl font-bold">{detail.seo_h1 || detail.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted flex items-center gap-1.5 text-sm">
              <Eye size={16} />
              {formatCount(detail.views_count)} · {formatRelativeDate(detail.published_at, lang)}
            </span>
            <div className="flex items-center gap-2">
              <VideoActions
                uuid={detail.uuid}
                likesCount={detail.likes_count}
                dislikesCount={detail.dislikes_count}
                favoritesCount={detail.favorites_count ?? 0}
              />
              <ReportModal videoUuid={detail.uuid} />
            </div>
          </div>

          <div className="border-border bg-surface/40 flex flex-col gap-3 rounded-2xl border p-4">
            {detail.actors.length > 0 ? (
              <p className="text-sm">
                <span className="text-muted font-semibold">{t("actorsTitle")}: </span>
                {detail.actors.map((actor, i) => (
                  <Fragment key={actor.uuid}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/actor/${actor.slug}`} className="text-link hover:underline">
                      {actor.name}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ) : null}

            {detail.categories.length > 0 ? (
              <p className="text-sm">
                <span className="text-muted font-semibold">{t("categoriesTitle")}: </span>
                {detail.categories.map((category, i) => (
                  <Fragment key={category.uuid}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/category/${category.slug}`} className="text-link hover:underline">
                      {category.name}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ) : null}

            {detail.description ? (
              <div className="flex flex-col gap-1.5">
                <h2 className="text-muted text-sm font-semibold">{t("descriptionTitle")}:</h2>
                <Description text={detail.description} />
              </div>
            ) : null}

            {detail.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => (
                  <Chip key={tag.uuid} href={`/tag/${tag.slug}`}>
                    #{tag.name}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>

          <CommentsSection videoUuid={detail.uuid} commentsCount={detail.comments_count} />

          <RelatedVideos videos={related} />
        </div>

        <PopularSidebar videos={popular.results} />
      </div>
    </Container>
  );
}
