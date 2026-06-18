import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import { ActorSchema, pageNumberPage, type Actor, type PageNumberPage } from "./types";

const ActorPageSchema = pageNumberPage(ActorSchema);

export type ActorSort = "popular" | "name" | "videos_count" | "newest";

export interface ActorListParams {
  q?: string;
  gender?: "woman" | "man" | "unknown";
  country?: string;
  sort?: ActorSort;
  page?: number;
  page_size?: number;
  lang?: Locale;
}

function parseActorPage(data: unknown): PageNumberPage<Actor> {
  const parsed = ActorPageSchema.safeParse(data);
  return parsed.success ? parsed.data : { count: 0, next: null, previous: null, results: [] };
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
  const res = await fetch(url, { headers: { Accept: "application/json" } });
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
