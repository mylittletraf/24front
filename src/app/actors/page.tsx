import { getLocale, getTranslations } from "next-intl/server";
import { ActorsFilters } from "@/components/actor/actors-filters";
import { ActorsGrid } from "@/components/actor/actors-grid";
import { Container } from "@/components/layout/container";
import { getActors, type ActorListParams, type ActorSort } from "@/lib/api/actors";
import { getTags } from "@/lib/api/taxonomy";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export default async function ActorsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; country?: string; sort?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("actorsFilters");

  const gender = sp.gender as ActorListParams["gender"] | undefined;
  const params: ActorListParams = {
    lang,
    gender: gender || undefined,
    country: sp.country || undefined,
    sort: (sp.sort as ActorSort) || "popular",
    page_size: 30,
  };

  const [initialPage, tags] = await Promise.all([getActors(params), getTags({ lang })]);
  const countries = tags
    .filter((tag) => tag.is_country)
    .map((tag) => ({ slug: tag.slug, name: tag.name }));

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {t("title")} <span className="text-muted text-base font-normal">{initialPage.count}</span>
        </h1>
        <ActorsFilters
          countries={countries}
          current={{ gender: sp.gender, country: sp.country, sort: sp.sort }}
        />
      </div>

      <ActorsGrid
        queryKey={["actors", lang, sp.gender ?? "", sp.country ?? "", sp.sort ?? "popular"]}
        params={params}
        initialPage={initialPage}
      />
    </Container>
  );
}
