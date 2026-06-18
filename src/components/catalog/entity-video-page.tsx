import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ActiveFilters, RefineBlock } from "@/components/catalog/refine-block";
import { FiltersDialog } from "@/components/catalog/filters-dialog";
import { SortSelect } from "@/components/catalog/sort-select";
import { JsonLd } from "@/components/seo/json-ld";
import { Description } from "@/components/video/description";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { ApiError } from "@/lib/api/errors";
import { getFilterLabels } from "@/lib/api/filter-labels";
import { getSeo } from "@/lib/api/seo";
import { getCatalogRelatedFilters } from "@/lib/api/related";
import { getTaxonomyDetail } from "@/lib/api/taxonomy";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideos } from "@/lib/api/videos";
import type { QueryValue } from "@/lib/api/fetcher";
import {
  filtersToApiParams,
  filtersToSearchString,
  parseFilters,
  type VideoFilters,
} from "@/lib/filters";
import type { Locale } from "@/lib/i18n/locales";

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

export async function EntityVideoPage({
  kind,
  slug,
  lang,
  searchParams,
}: {
  kind: "tags" | "categories";
  slug: string;
  lang: Locale;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("catalog");
  const isCategory = kind === "categories";
  const basePath = `/${isCategory ? "category" : "tag"}/${slug}`;

  let detail;
  try {
    detail = await getTaxonomyDetail(kind, slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, isCategory ? "category" : "tag", lang);
      if (r.redirect && r.new_slug) redirect(`${isCategory ? "/category" : "/tag"}/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  // Refine selections live in this page's own query string and accumulate in place.
  const refineFilters = parseFilters(searchParams);

  // The entity itself is the fixed base filter; refine selections are added on top.
  const combined: VideoFilters = {
    ...refineFilters,
    categories: isCategory ? uniq([slug, ...refineFilters.categories]) : refineFilters.categories,
    include_tags: isCategory
      ? refineFilters.include_tags
      : uniq([slug, ...refineFilters.include_tags]),
  };

  const apiParams: Record<string, QueryValue> = {
    lang,
    page_size: 24,
    ...filtersToApiParams(combined),
  };

  const [initialPage, related, seo, labels] = await Promise.all([
    getVideos(apiParams, { revalidate: 60 }),
    getCatalogRelatedFilters({ lang, ...filtersToApiParams(combined) }),
    getSeo(isCategory ? "category" : "tag", slug, lang),
    getFilterLabels(refineFilters, lang),
  ]);

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
      </header>

      {detail.description ? <Description text={detail.description} /> : null}

      <div className="flex items-center justify-end gap-2">
        <FiltersDialog filters={refineFilters} basePath={basePath} />
        <SortSelect filters={refineFilters} basePath={basePath} />
      </div>

      {/* Refine in place — chips stay on this page and accumulate (basePath = this entity). */}
      <RefineBlock related={related} filters={refineFilters} basePath={basePath} />
      <ActiveFilters filters={refineFilters} basePath={basePath} labels={labels} />

      <InfiniteVideoFeed
        queryKey={["videos", kind, slug, lang, filtersToSearchString(refineFilters)]}
        endpoint="/videos/"
        params={apiParams}
        initialPage={initialPage}
        emptyTitle={t("empty")}
      />
    </Container>
  );
}
