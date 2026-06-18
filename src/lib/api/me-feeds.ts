import { z } from "zod";
import { apiFetch } from "./fetcher";
import { ApiError } from "./errors";
import { pageNumberPage, VideoCardSchema, type PageNumberPage, type VideoCard } from "./types";

const VideoFeedPageSchema = pageNumberPage(VideoCardSchema);

function emptyPage<T>(): PageNumberPage<T> {
  return { count: 0, next: null, previous: null, results: [] };
}

/** A page-number /me/* video feed (favorites, liked, history, continue-watching). */
export async function getMeVideoFeed(
  path: string,
  token: string,
): Promise<PageNumberPage<VideoCard>> {
  const data = await apiFetch<unknown>(path, { token, cache: "no-store" });
  const parsed = VideoFeedPageSchema.safeParse(data);
  return parsed.success ? parsed.data : emptyPage();
}

export async function getMeVideoPageByUrl(
  url: string,
  token: string,
): Promise<PageNumberPage<VideoCard>> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const parsed = VideoFeedPageSchema.safeParse(await res.json());
  return parsed.success ? parsed.data : emptyPage();
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
  const parsed = pageNumberPage(ReportSchema).safeParse(data);
  return parsed.success ? parsed.data : emptyPage();
}
