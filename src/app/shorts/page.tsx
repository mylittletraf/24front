import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaginationNav } from "@/components/catalog/pagination-nav";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/common/empty-state";
import { ShortsGrid } from "@/components/shorts/shorts-grid";
import { ApiError } from "@/lib/api/errors";
import { pageFromSearchParams } from "@/lib/api/pagination";
import { getShortsPaged } from "@/lib/api/shorts";
import type { Locale } from "@/lib/i18n/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 30;

// Personalized, uncached feed — the indexable surface is /shorts/<slug>, so keep the listing out
// of the index. `follow: true` + the pager + per-card links still give crawlers a path to every
// /shorts/<slug>.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shorts");
  return { title: t("title"), robots: { index: false, follow: true } };
}

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function ShortsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("shorts");
  const page = pageFromSearchParams(sp);

  const data = await getShortsPaged({
    lang: (one(sp.lang) as Locale | undefined) ?? locale,
    page,
    page_size: PAGE_SIZE,
    categories: one(sp.categories),
    include_tags: one(sp.include_tags),
    actors: one(sp.actors),
  }).catch((error: unknown) => {
    // Out-of-range page → backend 404 (DRF NotFound). Page 1 always renders (even when empty).
    if (error instanceof ApiError && error.status === 404 && page > 1) notFound();
    throw error;
  });

  return (
    <Container className="desktop:py-6 flex flex-col gap-5 py-4">
      <h1 className="font-display text-xl font-bold tracking-tight">{t("title")}</h1>

      {data.results.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          action={
            <Link
              href="/"
              className="bg-accent text-on-accent hover:bg-accent-hover rounded-full px-5 py-2 text-sm font-medium"
            >
              {t("emptyCta")}
            </Link>
          }
        />
      ) : (
        <>
          <ShortsGrid shorts={data.results} />
          <PaginationNav
            basePath="/shorts"
            searchParams={sp}
            page={page}
            count={data.count}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </Container>
  );
}
