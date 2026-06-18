import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { ActiveFilters, RefineBlock } from "@/components/catalog/refine-block";
import { FiltersDialog } from "@/components/catalog/filters-dialog";
import { SortSelect } from "@/components/catalog/sort-select";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import type { QueryValue } from "@/lib/api/fetcher";
import { getCatalogRelatedFilters } from "@/lib/api/related";
import { getVideos } from "@/lib/api/videos";
import { filtersToApiParams, filtersToSearchString, parseFilters } from "@/lib/filters";

export const revalidate = 60;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("catalog");

  const filters = parseFilters(sp);
  const filterParams = filtersToApiParams(filters);
  const apiParams: Record<string, QueryValue> = {
    lang: locale,
    page_size: 24,
    ...filterParams,
  };

  const [initialPage, related] = await Promise.all([
    getVideos(apiParams, { revalidate: 60 }),
    getCatalogRelatedFilters({ lang: locale, ...filterParams }),
  ]);

  const queryKey = ["videos", "catalog", locale, filtersToSearchString(filters)];

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {t("title")}{" "}
          <span className="text-muted text-base font-normal">
            {related.total_videos.toLocaleString()}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <FiltersDialog filters={filters} basePath="/videos" />
          <SortSelect filters={filters} basePath="/videos" />
        </div>
      </div>

      <ActiveFilters filters={filters} basePath="/videos" />
      <RefineBlock related={related} filters={filters} basePath="/videos" />

      <InfiniteVideoFeed
        queryKey={queryKey}
        params={apiParams}
        initialPage={initialPage}
        emptyTitle={t("empty")}
      />
    </Container>
  );
}
