import { z } from "zod";
import { apiFetch, toProxyUrl } from "./fetcher";
import { ApiError } from "./errors";
import { parseList, VideoCardSchema, type PageNumberPage, type VideoCard } from "./types";

function toVideoPage(data: unknown): PageNumberPage<VideoCard> {
  const r = parseList(VideoCardSchema, data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results,
  };
}

/** A page-number /me/* video feed (favorites, liked, history, continue-watching). */
export async function getMeVideoFeed(
  path: string,
  token: string,
): Promise<PageNumberPage<VideoCard>> {
  const data = await apiFetch<unknown>(path, { token, cache: "no-store" });
  return toVideoPage(data);
}

export async function getMeVideoPageByUrl(
  url: string,
  token: string,
): Promise<PageNumberPage<VideoCard>> {
  const res = await fetch(toProxyUrl(url), {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return toVideoPage(await res.json());
}

/** Collect the user's favorited video UUIDs (paging through /me/favorites/, bounded). */
export async function getFavoriteVideoIds(token: string, maxPages = 10): Promise<string[]> {
  const ids: string[] = [];
  let page = await getMeVideoFeed("/me/favorites/?page_size=100", token);
  for (let i = 0; i < maxPages; i++) {
    for (const video of page.results) ids.push(video.uuid);
    if (!page.next) break;
    page = await getMeVideoPageByUrl(page.next, token);
  }
  return ids;
}

export async function clearHistory(token: string): Promise<void> {
  await apiFetch("/me/history/", { method: "DELETE", token });
}

export async function deleteHistoryItem(videoUuid: string, token: string): Promise<void> {
  await apiFetch(`/me/history/${videoUuid}/`, { method: "DELETE", token });
}

export const ReportSchema = z.object({
  uuid: z.string(),
  topic: z.union([z.string(), z.object({ name: z.string() }).transform((t) => t.name)]).optional(),
  target_type: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  created_at: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;

export async function getMeReports(token: string): Promise<PageNumberPage<Report>> {
  const data = await apiFetch<unknown>("/me/reports/", { token, cache: "no-store" });
  const r = parseList(ReportSchema, data);
  return {
    count: r.count ?? r.results.length,
    next: r.next,
    previous: r.previous,
    results: r.results,
  };
}
