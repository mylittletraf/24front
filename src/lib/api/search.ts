import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { ApiError } from "./errors";
import { apiFetch } from "./fetcher";
import {
  ActorSchema,
  pageNumberPage,
  TagSchema,
  VideoCardSchema,
  type PageNumberPage,
} from "./types";

export const SuggestionSchema = z.object({
  type: z.enum(["tag", "category", "actor"]),
  label: z.string(),
  slug: z.string(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

const SuggestionsSchema = z.array(SuggestionSchema);

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
  const parsed = SuggestionsSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

/** Route a suggestion to its destination page. */
export function suggestionHref(s: Suggestion): string {
  switch (s.type) {
    case "actor":
      return `/actor/${s.slug}`;
    case "category":
      return `/category/${s.slug}`;
    default:
      return `/tag/${s.slug}`;
  }
}

export const SearchAllSchema = z.object({
  videos: z.array(VideoCardSchema).default([]),
  tags: z.array(TagSchema).default([]),
  categories: z.array(TagSchema).default([]),
  actors: z.array(ActorSchema).default([]),
});
export type SearchAll = z.infer<typeof SearchAllSchema>;

export async function getSearchAll(q: string, lang?: Locale): Promise<SearchAll> {
  if (!q.trim()) return { videos: [], tags: [], categories: [], actors: [] };
  const data = await apiFetch<unknown>("/search/", { params: { q, lang }, cache: "no-store" });
  const parsed = SearchAllSchema.safeParse(data);
  return parsed.success ? parsed.data : { videos: [], tags: [], categories: [], actors: [] };
}

export const SEARCH_ITEM_SCHEMAS = {
  videos: VideoCardSchema,
  tags: TagSchema,
  categories: TagSchema,
  actors: ActorSchema,
} as const;

export type SearchType = keyof typeof SEARCH_ITEM_SCHEMAS;

function emptyPage<T>(): PageNumberPage<T> {
  return { count: 0, next: null, previous: null, results: [] };
}

/** First page of a typed search list (/search/videos|tags|categories|actors/). */
export async function getSearchType<T extends SearchType>(
  type: T,
  q: string,
  lang?: Locale,
): Promise<PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>> {
  if (!q.trim()) return emptyPage();
  const data = await apiFetch<unknown>(`/search/${type}/`, {
    params: { q, lang },
    cache: "no-store",
  });
  const parsed = pageNumberPage(SEARCH_ITEM_SCHEMAS[type]).safeParse(data);
  return parsed.success
    ? (parsed.data as PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>)
    : emptyPage();
}

/** Next page of a typed search list, by its absolute `next` URL. */
export async function getSearchTypeByUrl<T extends SearchType>(
  type: T,
  url: string,
): Promise<PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const parsed = pageNumberPage(SEARCH_ITEM_SCHEMAS[type]).safeParse(await res.json());
  return parsed.success
    ? (parsed.data as PageNumberPage<z.infer<(typeof SEARCH_ITEM_SCHEMAS)[T]>>)
    : emptyPage();
}
