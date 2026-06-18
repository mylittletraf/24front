import type { Locale } from "@/lib/i18n/locales";
import { apiFetch, type QueryValue } from "./fetcher";
import { ApiError } from "./errors";
import { VideoCardPageSchema, type CursorPage, type VideoCard } from "./types";

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
  const parsed = VideoCardPageSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  return { next: null, previous: null, results: [] };
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
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return parsePage(await res.json());
}
