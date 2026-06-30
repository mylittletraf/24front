import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ListingPagination } from "@/components/catalog/listing-pagination";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/common/empty-state";
import { ShortsGrid } from "@/components/shorts/shorts-grid";
import { cursorFromSearchParams } from "@/lib/api/pagination";
import { getShortsFeed } from "@/lib/api/shorts";
import type { Locale } from "@/lib/i18n/locales";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 30;

// Personalized, uncached feed — the indexable surface is /shorts/<slug>, so keep the listing out
// of the index. `follow: true` + the cursor pager + per-card links still give crawlers a path to
// every /shorts/<slug>.
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

  const page = await getShortsFeed({
    lang: (one(sp.lang) as Locale | undefined) ?? locale,
    page_size: PAGE_SIZE,
    cursor: cursorFromSearchParams(sp),
    categories: one(sp.categories),
    include_tags: one(sp.include_tags),
    actors: one(sp.actors),
  });

  return (
    <Container className="desktop:py-6 flex flex-col gap-5 py-4">
      <h1 className="font-display text-xl font-bold tracking-tight">{t("title")}</h1>

      {page.results.length === 0 ? (
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
          <ShortsGrid shorts={page.results} />
          <ListingPagination
            basePath="/shorts"
            searchParams={sp}
            prev={page.previous}
            next={page.next}
          />
        </>
      )}
    </Container>
  );
}
