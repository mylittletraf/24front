import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { ApiError } from "./errors";
import { apiFetch, toProxyUrl } from "./fetcher";
import { ActorSchema, parseList, TagSchema, VideoCardSchema, type PageNumberPage } from "./types";

export const SuggestionSchema = z.object({
  type: z.enum(["tag", "category", "studio", "actor"]),
  label: z.string(),
  slug: z.string(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export async function getSuggestions(
  q: string,
  lang?: Locale,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  if (q.trim().length < 2) return [];
  const data = await apiFetch<unknown>("/search/suggestions/", {
    params: { q, lang },
    signal,
  });
  // Parse per-item (drop unknown/bad rows) so one new backend `type` can't blank the whole dropdown.
  return Array.isArray(data)
    ? data.flatMap((item) => {
        const parsed = SuggestionSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
}

/** Route a suggestion to its destination page. */
export function suggestionHref(s: Suggestion): string {
  switch (s.type) {
    case "actor":
      return `/actor/${s.slug}`;
    case "category":
      return `/category/${s.slug}`;
    case "studio":
      return `/studio/${s.slug}`;
    default:
      return `/tag/${s.slug}`;
  }
}

export const SearchAllSchema = z.object({
  videos: z.array(VideoCardSchema).default([]),
  tags: z.array(TagSchema).default([]),
  categories: z.array(TagSchema).default([]),
  studios: z.array(TagSchema).default([]),
  actors: z.array(ActorSchema).default([]),
});
export type SearchAll = z.infer<typeof SearchAllSchema>;

export async function getSearchAll(q: string, lang?: Locale): Promise<SearchAll> {
  const empty = { videos: [], tags: [], categories: [], studios: [], actors: [] };
  if (!q.trim()) return empty;
  const data = await apiFetch<unknown>("/search/", { params: { q, lang }, cache: "no-store" });
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    videos: parseList(VideoCardSchema, obj.videos).results,
    tags: parseList(TagSchema, obj.tags).results,
    categories: parseList(TagSchema, obj.categories).results,
    studios: parseList(TagSchema, obj.studios).results,
    actors: parseList(ActorSchema, obj.actors).results,
  };
}

export const SEARCH_ITEM_SCHEMAS = {
  videos: VideoCardSchema,
  tags: TagSchema,
  categories: TagSchema,
  studios: TagSchema,
  actors: ActorSchema,
} as const;

export type SearchType = keyof typeof SEARCH_ITEM_SCHEMAS;

function toSearchPage<T extends SearchType>(
  type: T,
  data: unknown,
): PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>> {
  const r = parseList(SEARCH_ITEM_SCHEMAS[type], data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results as z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>[],
  };
}

/** First page of a typed search list (/search/videos|tags|categories|actors/). */
export async function getSearchType<T extends SearchType>(
  type: T,
  q: string,
  lang?: Locale,
): Promise<PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>> {
  if (!q.trim()) return { count: 0, next: null, previous: null, results: [] };
  const data = await apiFetch<unknown>(`/search/${type}/`, {
    params: { q, lang },
    cache: "no-store",
  });
  return toSearchPage(type, data);
}

/** Next page of a typed search list, by its absolute `next` URL. */
export async function getSearchTypeByUrl<T extends SearchType>(
  type: T,
  url: string,
): Promise<PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>> {
  const res = await fetch(toProxyUrl(url), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return toSearchPage(type, await res.json());
}
