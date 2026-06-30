import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { EntityVideoPage } from "@/components/catalog/entity-video-page";
import { SITE_URL } from "@/lib/api/config";
import { pagedMetadata } from "@/lib/api/pagination";
import { getSeo, seoToMetadata } from "@/lib/api/seo";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const langParam = typeof sp.lang === "string" ? sp.lang : undefined;
  const lang = langParam ? resolveLocale(langParam) : ((await getLocale()) as Locale);
  const seo = await getSeo("studio", slug, lang);
  return pagedMetadata(seoToMetadata(seo), seo?.canonical ?? SITE_URL, sp);
}

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  return <EntityVideoPage kind="studios" slug={slug} lang={lang} searchParams={sp} />;
}
