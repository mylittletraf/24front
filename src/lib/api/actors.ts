import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, toProxyUrl, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import {
  ActorSchema,
  NamedRefSchema,
  parseList,
  type Actor,
  type NamedRef,
  type PageNumberPage,
} from "./types";

export type ActorSort = "popular" | "name" | "videos_count" | "newest";

export interface ActorListParams {
  q?: string;
  gender?: "woman" | "man" | "unknown";
  country?: string;
  body_type?: string;
  bra_size?: string;
  boobs_type?: string;
  hair_color?: string;
  eye_color?: string;
  ethnicity?: string;
  height_min?: number;
  height_max?: number;
  weight_min?: number;
  weight_max?: number;
  sort?: ActorSort;
  page?: number;
  page_size?: number;
  lang?: Locale;
}

function parseActorPage(data: unknown): PageNumberPage<Actor> {
  const r = parseList(ActorSchema, data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results,
  };
}

export async function getActors(
  params: ActorListParams,
  opts: { revalidate?: number } = {},
): Promise<PageNumberPage<Actor>> {
  const data = await apiFetch<unknown>("/actors/", {
    params: params as Record<string, QueryValue>,
    revalidate: opts.revalidate ?? 300,
  });
  return parseActorPage(data);
}

export async function getActorsPageByUrl(url: string): Promise<PageNumberPage<Actor>> {
  const res = await fetch(toProxyUrl(url), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return parseActorPage(await res.json());
}

export async function getActor(slug: string, lang?: Locale): Promise<Actor> {
  const data = await apiFetch<unknown>(`/actors/${slug}/`, {
    params: { lang },
    revalidate: 300,
  });
  return ActorSchema.parse(data);
}

export interface ActorAttributeGroups {
  country: NamedRef[];
  body_type: NamedRef[];
  bra_size: NamedRef[];
  boobs_type: NamedRef[];
  hair_color: NamedRef[];
  eye_color: NamedRef[];
  ethnicity: NamedRef[];
}

/** Attribute value options for the actor filters (/actors/attributes/). */
export async function getActorAttributes(lang?: Locale): Promise<ActorAttributeGroups> {
  const empty: ActorAttributeGroups = {
    country: [],
    body_type: [],
    bra_size: [],
    boobs_type: [],
    hair_color: [],
    eye_color: [],
    ethnicity: [],
  };
  try {
    const data = await apiFetch<unknown>("/actors/attributes/", {
      params: { lang },
      revalidate: 3600,
    });
    const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    return {
      country: parseList(NamedRefSchema, obj.country).results,
      body_type: parseList(NamedRefSchema, obj.body_type).results,
      bra_size: parseList(NamedRefSchema, obj.bra_size).results,
      boobs_type: parseList(NamedRefSchema, obj.boobs_type).results,
      hair_color: parseList(NamedRefSchema, obj.hair_color).results,
      eye_color: parseList(NamedRefSchema, obj.eye_color).results,
      ethnicity: parseList(NamedRefSchema, obj.ethnicity).results,
    };
  } catch {
    return empty;
  }
}
