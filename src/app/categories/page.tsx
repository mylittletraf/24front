import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { SITE_URL } from "@/lib/api/config";
import { getCategories, getTags } from "@/lib/api/taxonomy";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("categoriesPage");
  return { title: t("categories"), alternates: { canonical: `${SITE_URL}/categories` } };
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("categoriesPage");
  const tb = await getTranslations("breadcrumbs");
  const crumbs: Crumb[] = [
    { name: tb("home"), url: "/" },
    { name: tb("categories"), url: "/categories" },
  ];

  const [categories, tags] = await Promise.all([
    getCategories({ lang, pageSize: 100 }),
    getTags({ lang, pageSize: 200 }),
  ]);

  const contentTags = tags.filter((tag) => !tag.is_category);

  return (
    <Container className="desktop:py-6 flex flex-col gap-8 py-4">
      <Breadcrumbs items={crumbs} />
      {categories.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h1 className="font-display desktop:text-2xl text-xl font-bold tracking-tight">
            {t("categories")}
          </h1>
          <div className="desktop:grid-cols-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.uuid}
                href={`/category/${cat.slug}`}
                className="group flex flex-col gap-2"
              >
                <div className="card-glow bg-surface-2 relative aspect-square w-full overflow-hidden rounded-lg">
                  {cat.preview_image ? (
                    <Image
                      src={cat.preview_image}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-muted grid h-full w-full place-items-center text-3xl font-semibold">
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="truncate text-sm font-medium">{cat.name}</p>
                  <p className="text-muted text-xs">
                    {t("videosCount", { count: cat.videos_count })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {contentTags.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="heading-rail text-lg font-semibold">{t("tags")}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {contentTags.map((tag) => (
              <Link
                key={tag.uuid}
                href={`/tag/${tag.slug}`}
                className="bg-surface hover:bg-surface-2 truncate rounded-full px-3 py-2 text-sm"
              >
                #{tag.name} <span className="text-muted">({tag.videos_count})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
