import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, toProxyUrl, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import {
  parseList,
  VideoCardSchema,
  type CursorPage,
  type PageNumberPage,
  type VideoCard,
} from "./types";

export type VideoSort =
  | "newest"
  | "oldest"
  | "popular"
  | "trending"
  | "most_liked"
  | "most_viewed"
  | "duration_short"
  | "duration_long";

export type VideoFeed = "trending" | "popular" | "new" | "recommended";

function parsePage(data: unknown): CursorPage<VideoCard> {
  const { next, previous, results } = parseList(VideoCardSchema, data);
  return { next, previous, results };
}

/** Cursor video listing from any endpoint (e.g. /videos/, /tags/{slug}/videos/). */
export async function getVideoList(
  endpoint: string,
  params: Record<string, QueryValue> = {},
  opts: { revalidate?: number } = {},
): Promise<CursorPage<VideoCard>> {
  const data = await apiFetch<unknown>(endpoint, {
    params,
    revalidate: opts.revalidate ?? 60,
  });
  return parsePage(data);
}

/** Catalog / filtered listing (cursor). Params are passed straight to /videos/. */
export function getVideos(
  params: Record<string, QueryValue> = {},
  opts: { revalidate?: number } = {},
): Promise<CursorPage<VideoCard>> {
  return getVideoList("/videos/", params, opts);
}

function parseVideoPage(data: unknown): PageNumberPage<VideoCard> {
  const r = parseList(VideoCardSchema, data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results,
  };
}

/**
 * Catalog / filtered listing in classic page-number mode. Sending `page` opts the backend into
 * its `{ count, next, previous, results }` envelope (cursor stays the default without it).
 */
export async function getVideosPaged(
  params: Record<string, QueryValue> = {},
  opts: { revalidate?: number } = {},
): Promise<PageNumberPage<VideoCard>> {
  const data = await apiFetch<unknown>("/videos/", {
    params,
    revalidate: opts.revalidate ?? 60,
  });
  return parseVideoPage(data);
}

/** Named feed: /videos/trending|popular|new|recommended/. */
export async function getVideoFeed(
  feed: VideoFeed,
  params: { lang?: Locale; page_size?: number } = {},
  opts: { revalidate?: number; token?: string } = {},
): Promise<CursorPage<VideoCard>> {
  const data = await apiFetch<unknown>(`/videos/${feed}/`, {
    params,
    revalidate: opts.token ? undefined : (opts.revalidate ?? 300),
    cache: opts.token ? "no-store" : undefined,
    token: opts.token,
  });
  return parsePage(data);
}

/** Fetch a cursor page by its absolute `next`/`previous` URL (client-side load-more). */
export async function getVideoPageByUrl(url: string): Promise<CursorPage<VideoCard>> {
  const res = await fetch(toProxyUrl(url), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return parsePage(await res.json());
}
