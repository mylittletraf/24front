import { getLocale } from "next-intl/server";
import { EntityVideoPage } from "@/components/catalog/entity-video-page";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  return <EntityVideoPage kind="categories" slug={slug} lang={lang} />;
}
