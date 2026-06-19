import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Chip } from "@/components/ui/chip";
import { CommentsSection } from "@/components/video/comments";
import { Description } from "@/components/video/description";
import { MetaRow } from "@/components/video/meta-row";
import { VideoPlayer } from "@/components/video/player";
import { ReportModal } from "@/components/video/report-modal";
import { VideoActions } from "@/components/video/video-actions";
import { VideoSection } from "@/components/video/video-section";
import { VideoSidebar } from "@/components/video/video-sidebar";
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
  const tAttr = await getTranslations("actor");

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
    getVideoFeed("popular", { lang, page_size: 12 }),
    getSeo("video", slug, lang),
  ]);

  // Aggregated actor attributes → chips that filter the catalog by /videos/?actor_<group>=.
  const aa = detail.actor_attributes ?? {};
  const attrGroups = [
    { items: aa.country, param: "actor_country", label: tAttr("country") },
    { items: aa.body_type, param: "actor_body_type", label: tAttr("bodyType") },
    { items: aa.bra_size, param: "actor_bra_size", label: tAttr("braSize") },
    { items: aa.boobs_type, param: "actor_boobs_type", label: tAttr("boobsType") },
    { items: aa.hair_color, param: "actor_hair_color", label: tAttr("hairColor") },
    { items: aa.eye_color, param: "actor_eye_color", label: tAttr("eyeColor") },
  ].filter((g) => g.items && g.items.length > 0);

  const hasMeta =
    detail.actors.length > 0 ||
    detail.categories.length > 0 ||
    attrGroups.length > 0 ||
    detail.tags.length > 0;

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

          {detail.description ? (
            <section className="flex flex-col gap-1.5">
              <h2 className="text-muted text-sm font-semibold">{t("descriptionTitle")}</h2>
              <Description text={detail.description} />
            </section>
          ) : null}

          {hasMeta ? (
          <dl className="border-border bg-surface/40 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-2xl border p-4 text-sm">
            {detail.actors.length > 0 ? (
              <MetaRow label={t("actorsTitle")}>
                {detail.actors.map((actor) => (
                  <Chip key={actor.uuid} href={`/actor/${actor.slug}`}>
                    {actor.gender === "woman" ? "♀ " : actor.gender === "man" ? "♂ " : ""}
                    {actor.name}
                  </Chip>
                ))}
              </MetaRow>
            ) : null}

            {detail.categories.length > 0 ? (
              <MetaRow label={t("categoriesTitle")}>
                {detail.categories.map((category) => (
                  <Chip key={category.uuid} href={`/category/${category.slug}`}>
                    {category.name}
                  </Chip>
                ))}
              </MetaRow>
            ) : null}

            {attrGroups.map((g) => (
              <MetaRow key={g.param} label={g.label}>
                {g.items!.map((it) => (
                  <Chip key={it.uuid} href={`/?${g.param}=${it.slug}`}>
                    {it.name}
                  </Chip>
                ))}
              </MetaRow>
            ))}

            {detail.tags.length > 0 ? (
              <MetaRow label={t("tagsTitle")}>
                {detail.tags.map((tag) => (
                  <Chip key={tag.uuid} href={`/tag/${tag.slug}`}>
                    #{tag.name}
                  </Chip>
                ))}
              </MetaRow>
            ) : null}
          </dl>
          ) : null}

          <CommentsSection videoUuid={detail.uuid} commentsCount={detail.comments_count} />

          <VideoSection title={t("popular")} videos={popular.results} />
        </div>

        <VideoSidebar title={t("related")} videos={related} />
      </div>
    </Container>
  );
}
