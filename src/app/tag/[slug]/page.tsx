import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { EntityVideoPage } from "@/components/catalog/entity-video-page";
import { getSeo, seoToMetadata } from "@/lib/api/seo";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  return seoToMetadata(await getSeo("tag", slug, lang));
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  return <EntityVideoPage kind="tags" slug={slug} lang={lang} />;
}
