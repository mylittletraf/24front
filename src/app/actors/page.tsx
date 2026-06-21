import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ActorsFiltersBar,
  ActorsFiltersTrigger,
  type ActorAttributes,
} from "@/components/actor/actors-filters";
import { ActorsGrid } from "@/components/actor/actors-grid";
import { Container } from "@/components/layout/container";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import {
  getActorAttributes,
  getActors,
  type ActorListParams,
  type ActorSort,
} from "@/lib/api/actors";
import { SITE_URL } from "@/lib/api/config";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("actorsFilters");
  return { title: t("title"), alternates: { canonical: `${SITE_URL}/actors` } };
}

type SP = Record<string, string | string[] | undefined>;

function str(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

function num(value: string | string[] | undefined): number | undefined {
  const v = str(value);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ActorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(str(sp.lang)) : ((await getLocale()) as Locale);
  const t = await getTranslations("actorsFilters");
  const tb = await getTranslations("breadcrumbs");
  const crumbs: Crumb[] = [
    { name: tb("home"), url: "/" },
    { name: tb("actors"), url: "/actors" },
  ];

  // Default to women; "any" explicitly clears the gender filter.
  const genderValue = str(sp.gender) ?? "woman";

  const params: ActorListParams = {
    lang,
    gender: genderValue === "any" ? undefined : (genderValue as ActorListParams["gender"]),
    country: str(sp.country),
    body_type: str(sp.body_type),
    bra_size: str(sp.bra_size),
    boobs_type: str(sp.boobs_type),
    hair_color: str(sp.hair_color),
    eye_color: str(sp.eye_color),
    height_min: num(sp.height_min),
    height_max: num(sp.height_max),
    weight_min: num(sp.weight_min),
    weight_max: num(sp.weight_max),
    sort: (str(sp.sort) as ActorSort) || "popular",
    page_size: 30,
  };

  const [initialPage, attrs] = await Promise.all([getActors(params), getActorAttributes(lang)]);

  const attributes: ActorAttributes = {
    countries: attrs.country,
    bodyTypes: attrs.body_type,
    braSizes: attrs.bra_size,
    boobsTypes: attrs.boobs_type,
    hairColors: attrs.hair_color,
    eyeColors: attrs.eye_color,
  };

  const current = {
    gender: genderValue,
    country: str(sp.country),
    body_type: str(sp.body_type),
    bra_size: str(sp.bra_size),
    boobs_type: str(sp.boobs_type),
    hair_color: str(sp.hair_color),
    eye_color: str(sp.eye_color),
    height_min: str(sp.height_min),
    height_max: str(sp.height_max),
    weight_min: str(sp.weight_min),
    weight_max: str(sp.weight_max),
    sort: str(sp.sort),
  };

  return (
    <Container className="desktop:py-6 flex flex-col gap-4 py-4">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight">
          {t("title")}{" "}
          <span className="text-muted font-sans text-base font-normal">{initialPage.count}</span>
        </h1>
        <ActorsFiltersTrigger attributes={attributes} current={current} />
      </div>

      <ActorsFiltersBar attributes={attributes} current={current} />

      <ActorsGrid
        queryKey={["actors", lang, JSON.stringify(current)]}
        params={params}
        initialPage={initialPage}
      />
    </Container>
  );
}
