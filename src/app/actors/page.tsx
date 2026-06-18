import { getLocale, getTranslations } from "next-intl/server";
import {
  ActorsFiltersBar,
  ActorsFiltersTrigger,
  type ActorAttributes,
} from "@/components/actor/actors-filters";
import { ActorsGrid } from "@/components/actor/actors-grid";
import { Container } from "@/components/layout/container";
import { getActors, type ActorListParams, type ActorSort } from "@/lib/api/actors";
import type { Tag } from "@/lib/api/types";
import { getTags } from "@/lib/api/taxonomy";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

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

function options(tags: Tag[], flag: keyof Tag): { slug: string; name: string }[] {
  return tags.filter((t) => t[flag]).map((t) => ({ slug: t.slug, name: t.name }));
}

export default async function ActorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(str(sp.lang)) : ((await getLocale()) as Locale);
  const t = await getTranslations("actorsFilters");

  const params: ActorListParams = {
    lang,
    gender: str(sp.gender) as ActorListParams["gender"],
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

  const [initialPage, tags] = await Promise.all([getActors(params), getTags({ lang })]);

  const attributes: ActorAttributes = {
    countries: options(tags, "is_country"),
    bodyTypes: options(tags, "is_body_type"),
    braSizes: options(tags, "is_bra_size"),
    boobsTypes: options(tags, "is_boobs_type"),
    hairColors: options(tags, "is_hair_color"),
    eyeColors: options(tags, "is_eye_color"),
  };

  const current = {
    gender: str(sp.gender),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {t("title")} <span className="text-muted text-base font-normal">{initialPage.count}</span>
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
