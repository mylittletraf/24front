import { Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ActiveFilters, RefineBlock } from "@/components/catalog/refine-block";
import { ListingPagination } from "@/components/catalog/listing-pagination";
import { SaveFilterButton } from "@/components/catalog/save-filter-button";
import { SortSelect } from "@/components/catalog/sort-select";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Accordion } from "@/components/ui/accordion";
import { SafeImage } from "@/components/ui/safe-image";
import { Description } from "@/components/video/description";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { ApiError } from "@/lib/api/errors";
import { getFilterLabels } from "@/lib/api/filter-labels";
import { getCatalogRelatedFilters } from "@/lib/api/related";
import { getTaxonomyDetail } from "@/lib/api/taxonomy";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideos } from "@/lib/api/videos";
import { cursorFromSearchParams } from "@/lib/api/pagination";
import type { QueryValue } from "@/lib/api/fetcher";
import { collectionPageJsonLd, faqPageJsonLd, graph } from "@/lib/seo/structured-data";
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

/** Per-taxonomy wiring: route base, redirect entity, breadcrumb index, header style, base filter. */
const KIND_CONF = {
  tags: {
    base: "/tag",
    redirect: "tag",
    stateType: "tag",
    indexCrumb: null,
    hashPrefix: true,
    filterKey: "include_tags",
  },
  categories: {
    base: "/category",
    redirect: "category",
    stateType: "category",
    indexCrumb: { key: "categories", path: "/categories" },
    hashPrefix: false,
    filterKey: "categories",
  },
  studios: {
    base: "/studio",
    redirect: "studio",
    stateType: "studio",
    indexCrumb: { key: "studios", path: "/studios" },
    hashPrefix: false,
    filterKey: "studios",
  },
} as const;

export async function EntityVideoPage({
  kind,
  slug,
  lang,
  searchParams,
}: {
  kind: "tags" | "categories" | "studios";
  slug: string;
  lang: Locale;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("catalog");
  const tb = await getTranslations("breadcrumbs");
  const tNav = await getTranslations("nav");
  const conf = KIND_CONF[kind];
  const basePath = `${conf.base}/${slug}`;

  let detail;
  try {
    detail = await getTaxonomyDetail(kind, slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, conf.redirect, lang);
      if (r.redirect && r.new_slug) redirect(`${conf.base}/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  // Refine selections live in this page's own query string and accumulate in place.
  const refineFilters = parseFilters(searchParams);

  // The entity itself is the fixed base filter; refine selections are added on top.
  const combined: VideoFilters = { ...refineFilters };
  combined[conf.filterKey] = uniq([slug, ...refineFilters[conf.filterKey]]);

  // Cursor from this page's own URL (?cursor=…) — the crawlable deep-pagination param.
  const cursor = cursorFromSearchParams(searchParams);
  const apiParams: Record<string, QueryValue> = {
    lang,
    page_size: 24,
    ...filtersToApiParams(combined),
    ...(cursor ? { cursor } : {}),
  };

  const [initialPage, related, labels] = await Promise.all([
    getVideos(apiParams, { revalidate: 60 }),
    getCatalogRelatedFilters({ lang, ...filtersToApiParams(combined) }),
    getFilterLabels(refineFilters, lang),
  ]);

  // Breadcrumbs: Home › <index> › name (categories/studios have an index page; tags don't).
  const crumbs: Crumb[] = [{ name: tb("home"), url: "/" }];
  if (conf.indexCrumb) crumbs.push({ name: tb(conf.indexCrumb.key), url: conf.indexCrumb.path });
  crumbs.push({ name: detail.name, url: basePath });

  // Tag synonyms (categories rarely have them) — fed to alternateName + a visible "also known as".
  const aliases = (detail.aliases ?? []).filter((a) => a && a !== detail.name);

  // CollectionPage wrapping an ItemList of the first page of videos (+ FAQPage when present).
  const pageGraph = graph(
    collectionPageJsonLd({
      name: detail.name,
      url: basePath,
      description: detail.description,
      alternateName: aliases,
      dateModified: detail.date_modified,
      subscribersCount: detail.subscribers_count,
      videos: initialPage.results,
    }),
    detail.faq.length > 0 ? faqPageJsonLd(detail.faq) : [],
  );

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <JsonLd data={pageGraph} />
      <Breadcrumbs items={crumbs} />
      <header className="flex items-center gap-4">
        <SafeImage
          src={detail.preview_image}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-full object-cover"
        />
        <div className="flex-1">
          <h1 className="font-display desktop:text-2xl text-xl font-bold tracking-tight">
            {conf.hashPrefix ? `#${detail.name}` : detail.name}
          </h1>
          <p className="text-muted text-sm">
            {detail.videos_count.toLocaleString()} {t("title").toLowerCase()}
          </p>
          {aliases.length > 0 ? (
            // Hidden visually but kept in the DOM (+ in CollectionPage.alternateName JSON-LD) so
            // search engines still index the synonyms.
            <p className="sr-only">
              {t("alsoKnownAs")}: {aliases.join(", ")}
            </p>
          ) : null}
        </div>
      </header>

      {detail.description ? <Description text={detail.description} /> : null}

      {detail.faq.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="heading-rail text-lg font-semibold">{t("faqTitle")}</h2>
          <Accordion items={detail.faq} />
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Enter the vertical Shorts feed scoped to this category/tag (studios have no shorts entry). */}
        {kind !== "studios" ? (
          <Link
            href={`/shorts?${conf.filterKey}=${slug}`}
            className="border-border text-foreground hover:bg-surface inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium"
          >
            <Zap size={16} />
            {tNav("shorts")}
          </Link>
        ) : null}
        <SaveFilterButton
          filters={combined}
          labels={{ ...labels, [slug]: detail.name }}
          count={detail.subscribers_count}
          entity={{ type: conf.stateType, slug }}
          entityName={detail.name}
        />
        <SortSelect filters={refineFilters} basePath={basePath} />
      </div>

      {/* Refine in place — chips stay on this page and accumulate (basePath = this entity). */}
      <RefineBlock related={related} filters={refineFilters} basePath={basePath} />
      <ActiveFilters filters={refineFilters} basePath={basePath} labels={labels} />

      <InfiniteVideoFeed
        queryKey={["videos", kind, slug, lang, filtersToSearchString(refineFilters), cursor ?? ""]}
        endpoint="/videos/"
        params={apiParams}
        initialPage={initialPage}
        emptyTitle={t("empty")}
      />

      {/* Crawlable prev/next links (cursor chain) so bots can walk the whole catalog. */}
      <ListingPagination
        basePath={basePath}
        searchParams={searchParams}
        prev={initialPage.previous}
        next={initialPage.next}
      />
    </Container>
  );
}
