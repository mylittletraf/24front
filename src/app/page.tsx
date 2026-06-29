import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { ActiveFilters } from "@/components/catalog/refine-block";
import { ListingPagination } from "@/components/catalog/listing-pagination";
import { SaveFilterButton } from "@/components/catalog/save-filter-button";
import { SortSelect } from "@/components/catalog/sort-select";
import { Container } from "@/components/layout/container";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { SITE_URL } from "@/lib/api/config";
import { cursorFromSearchParams } from "@/lib/api/pagination";
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

// Filtered catalog views (?actor_country=…, ?sort=…) all canonicalize to the clean home URL.
export const metadata: Metadata = { alternates: { canonical: SITE_URL } };

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
  const cursor = cursorFromSearchParams(sp);
  const apiParams: Record<string, QueryValue> = {
    lang: locale,
    page_size: 50,
    ...filterParams,
    ...(cursor ? { cursor } : {}),
  };

  // The filter panel (and its facet counts) is shown always, so related-filters is fetched
  // unconditionally; `active` still gates the save-filter button and shorts interleaving.
  const active = hasActiveFilters(filters);
  const [initialPage, related, labels] = await Promise.all([
    getVideos(apiParams, { revalidate: 60 }),
    getCatalogRelatedFilters({ lang: locale, ...filterParams }),
    getFilterLabels(filters, locale),
  ]);
  const queryKey = ["videos", "catalog", locale, filtersToSearchString(filters), cursor ?? ""];

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <CatalogFilters filters={filters} basePath="/" related={related} labels={labels} />
          <SortSelect filters={filters} basePath="/" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActiveFilters filters={filters} basePath="/" labels={labels} />
        {active ? <SaveFilterButton filters={filters} labels={labels} /> : null}
      </div>

      <InfiniteVideoFeed
        queryKey={queryKey}
        params={apiParams}
        initialPage={initialPage}
        emptyTitle={t("empty")}
        manual
        loadMorePageSize={20}
        interleaveShorts={!active}
      />

      {/* Crawlable prev/next links (cursor chain) so bots can walk the whole catalog. */}
      <ListingPagination
        basePath="/"
        searchParams={sp}
        prev={initialPage.previous}
        next={initialPage.next}
      />
    </Container>
  );
}
