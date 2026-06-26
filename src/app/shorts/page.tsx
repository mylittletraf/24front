import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShortsFeed } from "@/components/shorts/shorts-feed";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Personalized, uncached CSR feed — nothing to crawl here (the shareable, indexable surface is
// /shorts/<slug>), so keep the global feed out of the index.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shorts");
  return { title: t("title"), robots: { index: false, follow: true } };
}

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export default async function ShortsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <ShortsFeed
      scope={{
        categories: one(sp.categories),
        include_tags: one(sp.include_tags),
        actors: one(sp.actors),
      }}
      lang={one(sp.lang)}
    />
  );
}
