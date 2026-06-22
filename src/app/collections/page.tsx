import type { Metadata } from "next";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/common/empty-state";
import { Container } from "@/components/layout/container";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { SITE_URL } from "@/lib/api/config";
import { getCollections } from "@/lib/api/collections";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("title"), alternates: { canonical: `${SITE_URL}/collections` } };
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("collections");
  const tb = await getTranslations("breadcrumbs");
  const crumbs: Crumb[] = [
    { name: tb("home"), url: "/" },
    { name: tb("collections"), url: "/collections" },
  ];

  const page = await getCollections(lang);

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <Breadcrumbs items={crumbs} />
      <h1 className="desktop:text-2xl text-xl font-bold">{t("title")}</h1>

      {page.results.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.results.map((collection) => (
            <Link
              key={collection.slug}
              href={`/collection/${collection.slug}`}
              className="group flex flex-col gap-2"
            >
              <div className="bg-surface relative aspect-video w-full overflow-hidden rounded-xl">
                <SafeImage
                  src={collection.cover_image}
                  alt={collection.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
              <h2 className="font-medium">{collection.title}</h2>
              {collection.short_description ? (
                <p className="text-muted line-clamp-2 text-sm">{collection.short_description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
