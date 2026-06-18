import { getLocale, getTranslations } from "next-intl/server";
import { ActiveFilters, RefineBlock } from "@/components/catalog/refine-block";
import { SaveFilterButton } from "@/components/catalog/save-filter-button";
import { FiltersDialog } from "@/components/catalog/filters-dialog";
import { SortSelect } from "@/components/catalog/sort-select";
import { Container } from "@/components/layout/container";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import type { QueryValue } from "@/lib/api/fetcher";
import { getFilterLabels } from "@/lib/api/filter-labels";
import { getCatalogRelatedFilters } from "@/lib/api/related";
import { getVideos } from "@/lib/api/videos";
import {
  filtersToApiParams,
  filtersToSearchString,
  hasActiveFilters,
  parseFilters,
} from "@/lib/filters";
import type { Locale } from "@/lib/i18n/locales";

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("catalog");

  const filters = parseFilters(sp);
  const filterParams = filtersToApiParams(filters);
  const apiParams: Record<string, QueryValue> = {
    lang: locale,
    page_size: 24,
    ...filterParams,
  };

  // Refine is shown only on a *filtered* list (not the bare home).
  const active = hasActiveFilters(filters);
  const [initialPage, related, labels] = await Promise.all([
    getVideos(apiParams, { revalidate: 60 }),
    active ? getCatalogRelatedFilters({ lang: locale, ...filterParams }) : Promise.resolve(null),
    active ? getFilterLabels(filters, locale) : Promise.resolve({}),
  ]);
  const queryKey = ["videos", "catalog", locale, filtersToSearchString(filters)];

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <FiltersDialog filters={filters} basePath="/" />
          <SortSelect filters={filters} basePath="/" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActiveFilters filters={filters} basePath="/" labels={labels} />
        {active ? <SaveFilterButton filters={filters} labels={labels} /> : null}
      </div>
      {related ? <RefineBlock related={related} filters={filters} basePath="/" /> : null}

      <InfiniteVideoFeed
        queryKey={queryKey}
        params={apiParams}
        initialPage={initialPage}
        emptyTitle={t("empty")}
      />
    </Container>
  );
}
