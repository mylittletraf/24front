import type { Metadata } from "next";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { SITE_URL } from "@/lib/api/config";
import { getStudios } from "@/lib/api/taxonomy";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("studiosPage");
  return { title: t("title"), alternates: { canonical: `${SITE_URL}/studios` } };
}

export default async function StudiosPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("studiosPage");
  const tb = await getTranslations("breadcrumbs");
  const crumbs: Crumb[] = [
    { name: tb("home"), url: "/" },
    { name: tb("studios"), url: "/studios" },
  ];

  const studios = await getStudios({ lang, pageSize: 200 });

  return (
    <Container className="desktop:py-6 flex flex-col gap-8 py-4">
      <Breadcrumbs items={crumbs} />
      <section className="flex flex-col gap-4">
        <h1 className="desktop:text-2xl text-xl font-bold">{t("title")}</h1>
        {studios.length > 0 ? (
          <div className="desktop:grid-cols-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {studios.map((studio, i) => (
              <Link
                key={studio.uuid}
                href={`/studio/${studio.slug}`}
                className="group flex flex-col gap-2"
              >
                <div className="border-border bg-surface group-hover:bg-surface-2 relative aspect-square w-full overflow-hidden rounded-xl border p-3 transition-colors">
                  <SafeImage
                    src={studio.preview_image}
                    alt={studio.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    // First row (up to 8 cols on desktop) is above the fold — eager-load to fix the LCP warning.
                    priority={i < 8}
                    loading={i < 8 ? undefined : "lazy"}
                    className="object-contain"
                    fallback={
                      <div className="text-muted grid h-full w-full place-items-center text-3xl font-semibold">
                        {studio.name.charAt(0).toUpperCase()}
                      </div>
                    }
                  />
                </div>
                <div>
                  <p className="truncate text-sm font-medium">{studio.name}</p>
                  <p className="text-muted text-xs">
                    {t("videosCount", { count: studio.videos_count })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </Container>
  );
}
