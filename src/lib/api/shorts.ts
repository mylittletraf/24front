import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, toProxyUrl, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import {
  NamedRefSchema,
  NullableMedia,
  parseList,
  VideoCardSchema,
  type CursorPage,
  type PageNumberPage,
} from "./types";

/** Lightweight actor ref carried on enriched shorts cards (not the heavy detail ActorSchema). */
export const ShortActorRefSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  gender: z.string().optional(),
});
export type ShortActorRef = z.infer<typeof ShortActorRefSchema>;

/**
 * Shorts feed element — a video card plus the inline-player `sources`. Note the backend now
 * returns `sources.hls = null` (the signed master playlist is short-lived, fetched per-video via
 * `/videos/{uuid}/playback/`); `sources` is kept lenient since we don't depend on its `hls`.
 *
 * Recommended/shorts cards are enriched with `actors`/`categories`/`tags` so the overlay renders
 * without a detail request (docs/RECOMMENDATIONS_FRONTEND_TASK.md §4). Kept lenient (`.catch([])`).
 */
export const VideoShortSchema = VideoCardSchema.extend({
  is_vertical: z.boolean().catch(true),
  sources: z
    .object({
      mp4: z.unknown().optional(),
      hls: NullableMedia.optional(),
      trailer: NullableMedia.optional(),
    })
    .partial()
    .optional(),
  actors: z.array(ShortActorRefSchema).catch([]),
  categories: z.array(NamedRefSchema).catch([]),
  tags: z.array(NamedRefSchema).catch([]),
});
export type VideoShort = z.infer<typeof VideoShortSchema>;

function parsePage(data: unknown): CursorPage<VideoShort> {
  const { next, previous, results } = parseList(VideoShortSchema, data);
  return { next, previous, results };
}

export interface ShortsFeedParams {
  lang?: Locale;
  page_size?: number;
  /** CSV-slug catalog scope (overlap match) — same filters as the catalog. */
  categories?: string;
  include_tags?: string;
  actors?: string;
  cursor?: string;
  /** 1-based page — sending it opts the backend into page-number mode (see getShortsPaged). */
  page?: number;
}

function parsePagedShorts(data: unknown): PageNumberPage<VideoShort> {
  const r = parseList(VideoShortSchema, data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results,
  };
}

/**
 * Shorts listing in classic page-number mode (the /shorts catalog grid). Sending `page` opts the
 * backend into its `{ count, next, previous, results }` envelope (cursor stays the default for the
 * fullscreen swipe feed without it). Out-of-range pages 404 (DRF NotFound).
 */
export async function getShortsPaged(
  params: ShortsFeedParams = {},
  opts: { token?: string | null; signal?: AbortSignal } = {},
): Promise<PageNumberPage<VideoShort>> {
  const data = await apiFetch<unknown>("/videos/shorts/", {
    params: params as Record<string, QueryValue>,
    cache: "no-store",
    token: opts.token ?? undefined,
    signal: opts.signal,
  });
  return parsePagedShorts(data);
}

/**
 * Vertical "shorts" feed (cursor pagination). Personalized + uncached: always fetched fresh,
 * with the JWT passed so the order reflects the user's watch history. Anonymous → trending.
 */
export async function getShortsFeed(
  params: ShortsFeedParams = {},
  opts: { token?: string | null; signal?: AbortSignal } = {},
): Promise<CursorPage<VideoShort>> {
  const data = await apiFetch<unknown>("/videos/shorts/", {
    params: params as Record<string, QueryValue>,
    cache: "no-store",
    token: opts.token ?? undefined,
    signal: opts.signal,
  });
  return parsePage(data);
}

/** Fetch a cursor page by its (proxy-masked) `next` URL, carrying the JWT for personalization. */
export async function getShortsPageByUrl(
  url: string,
  token?: string | null,
): Promise<CursorPage<VideoShort>> {
  const res = await fetch(toProxyUrl(url), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return parsePage(await res.json());
}
