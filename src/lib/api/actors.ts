import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, toProxyUrl, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import { ActorSchema, parseList, type Actor, type PageNumberPage } from "./types";

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
