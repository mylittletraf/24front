import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { RefineBlock } from "@/components/catalog/refine-block";
import { JsonLd } from "@/components/seo/json-ld";
import { LanguageSwitcher } from "@/components/seo/language-switcher";
import { Description } from "@/components/video/description";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { ApiError } from "@/lib/api/errors";
import { getSeo } from "@/lib/api/seo";
import { getEntityRelatedFilters } from "@/lib/api/related";
import { getTaxonomyDetail } from "@/lib/api/taxonomy";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideoList } from "@/lib/api/videos";
import type { QueryValue } from "@/lib/api/fetcher";
import { emptyFilters, type VideoFilters } from "@/lib/filters";
import type { Locale } from "@/lib/i18n/locales";

export async function EntityVideoPage({
  kind,
  slug,
  lang,
}: {
  kind: "tags" | "categories";
  slug: string;
  lang: Locale;
}) {
  const t = await getTranslations("catalog");
  const isCategory = kind === "categories";

  let detail;
  try {
    detail = await getTaxonomyDetail(kind, slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, isCategory ? "category" : "tag", lang);
      if (r.redirect && r.new_slug) redirect(`/${isCategory ? "category" : "tag"}/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  const endpoint = `/${kind}/${slug}/videos/`;
  const params: Record<string, QueryValue> = { lang, page_size: 24 };

  const [initialPage, related, seo] = await Promise.all([
    getVideoList(endpoint, params, { revalidate: 60 }),
    getEntityRelatedFilters(kind, slug, { lang }),
    getSeo(isCategory ? "category" : "tag", slug, lang),
  ]);

  // Selecting refine chips moves the user to the catalog with combined filters.
  const baseFilters: VideoFilters = isCategory
    ? { ...emptyFilters, categories: [slug] }
    : { ...emptyFilters, include_tags: [slug] };

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <JsonLd data={seo?.json_ld} />
      <header className="flex items-center gap-4">
        {detail.preview_image ? (
          <Image
            src={detail.preview_image}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : null}
        <div className="flex-1">
          <h1 className="desktop:text-2xl text-xl font-bold">
            {isCategory ? detail.name : `#${detail.name}`}
          </h1>
          <p className="text-muted text-sm">
            {detail.videos_count.toLocaleString()} {t("title").toLowerCase()}
          </p>
        </div>
        {seo ? (
          <LanguageSwitcher
            alternates={seo.alternates}
            current={detail.language ?? lang}
            fallbackLanguage={detail.fallback_language}
          />
        ) : null}
      </header>

      {detail.description ? <Description text={detail.description} /> : null}

      <RefineBlock related={related} filters={baseFilters} basePath="/videos" />

      <InfiniteVideoFeed
        queryKey={["videos", kind, slug, lang]}
        endpoint={endpoint}
        params={params}
        initialPage={initialPage}
        emptyTitle={t("empty")}
      />
    </Container>
  );
}
