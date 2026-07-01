import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { toMediaUrl } from "@/lib/media";
import { apiFetch, apiFetchStatus } from "./fetcher";

/**
 * DEV-ONLY: route a playback URL on a loopback host through the same-origin `/media` proxy so it's
 * reachable from another device on the LAN (e.g. a phone), where `localhost`/`127.0.0.1` point at the
 * phone itself. No-op in production — there the backend returns public/signed URLs that every device
 * reaches directly, and HLS must stay off the proxy (see getPlayback). The proxy rewrites the m3u8
 * playlists so the nested variant/segment URLs go through `/media` too.
 */
function devLocalProxy<T extends string | null | undefined>(url: T): T {
  if (process.env.NODE_ENV === "production" || !url || !/^https?:\/\//i.test(url)) return url;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return toMediaUrl(url);
  } catch {
    /* unparseable — leave as-is */
  }
  return url;
}

export type Reaction = "like" | "dislike";
export type AdPlacement =
  | "pre_roll"
  | "mid_roll"
  | "post_roll"
  // Yandex Video embed (/embed/[slug]) only — separate backend tags so they can be
  // toggled independently of the on-site pre/post-roll (204 = disabled).
  | "ya_vast_preroll"
  | "ya_vast_postroll";

/** Count a view (deduped server-side). Anonymous-friendly; pass token to attribute to the user (history). */
export async function postView(videoUuid: string, token?: string | null): Promise<void> {
  await apiFetch(`/videos/${videoUuid}/view/`, { method: "POST", token: token ?? undefined }).catch(
    () => undefined,
  );
}

/** Anonymous like (deduped 7d by IP server-side). */
export async function postGuestLike(videoUuid: string): Promise<{ counted: boolean }> {
  const data = await apiFetch<{ counted?: boolean }>(`/videos/${videoUuid}/guest-like/`, {
    method: "POST",
  });
  return { counted: Boolean(data?.counted) };
}

export async function setReaction(videoUuid: string, reaction: Reaction, token: string) {
  await apiFetch(`/videos/${videoUuid}/reaction/`, { method: "POST", body: { reaction }, token });
}

export async function clearReaction(videoUuid: string, token: string) {
  await apiFetch(`/videos/${videoUuid}/reaction/`, { method: "DELETE", token });
}

export async function addFavorite(videoUuid: string, token: string) {
  await apiFetch(`/videos/${videoUuid}/favorite/`, { method: "POST", token });
}

export async function removeFavorite(videoUuid: string, token: string) {
  await apiFetch(`/videos/${videoUuid}/favorite/`, { method: "DELETE", token });
}

/** Watch-progress "event" the recommender learns from (see docs/RECOMMENDATIONS_FRONTEND_TASK.md §0). */
export type ProgressEvent = "heartbeat" | "ended" | "skipped";

export async function postProgress(
  videoUuid: string,
  watchProgress: number,
  lastPositionSeconds: number,
  token: string,
  event?: ProgressEvent,
) {
  await apiFetch(`/videos/${videoUuid}/progress/`, {
    method: "POST",
    body: {
      watch_progress: watchProgress,
      last_position_seconds: lastPositionSeconds,
      // Omit when heartbeat (the backend default) — only tag the terminal ended/skipped signals.
      ...(event && event !== "heartbeat" ? { event } : {}),
    },
    token,
  }).catch(() => undefined);
}

const VastSchema = z.object({
  name: z.string().optional(),
  vast_url: z.string(),
  placement: z.string().optional(),
});

/** Returns the VAST tag URL for a placement, or null when the backend answers 204 (no ad). */
export async function getVast(videoUuid: string, placement: AdPlacement): Promise<string | null> {
  const { status, data } = await apiFetchStatus(`/videos/${videoUuid}/vast/`, {
    params: { placement },
    cache: "no-store",
  });
  if (status !== 200) return null;
  const parsed = VastSchema.safeParse(data);
  return parsed.success ? parsed.data.vast_url : null;
}

const PlaybackSchema = z.object({
  // Backend master playlist (signed variants/segments inside); fed straight to the player.
  hls: z.string().nullable().optional(),
  poster: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});
export type Playback = z.infer<typeof PlaybackSchema>;

/**
 * Short-lived signed playback URL — fetched fresh on play (no-store), never cached. The `hls` is
 * the backend master playlist whose variants/segments are already signed, so it's used as-is (no
 * media masking). Returns null when the video is unavailable (403/404) or the body is unparseable.
 */
export async function getPlayback(
  videoUuid: string,
  token?: string | null,
): Promise<Playback | null> {
  const { status, data } = await apiFetchStatus(`/videos/${videoUuid}/playback/`, {
    cache: "no-store",
    token: token ?? undefined,
  });
  if (status !== 200) return null;
  const parsed = PlaybackSchema.safeParse(data);
  if (!parsed.success) return null;
  // Dev-only: make loopback HLS/poster reachable from a phone on the LAN. Prod is untouched.
  return {
    ...parsed.data,
    hls: devLocalProxy(parsed.data.hls),
    poster: devLocalProxy(parsed.data.poster),
  };
}

export const ReportTopicSchema = z.object({ slug: z.string(), name: z.string() });
export type ReportTopic = z.infer<typeof ReportTopicSchema>;

export async function getReportTopics(lang?: Locale): Promise<ReportTopic[]> {
  try {
    const data = await apiFetch<unknown>("/report-topics/", { params: { lang }, revalidate: 1800 });
    const parsed = z.array(ReportTopicSchema).safeParse(data);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function reportVideo(videoUuid: string, topic: string, description: string) {
  await apiFetch(`/videos/${videoUuid}/report/`, {
    method: "POST",
    body: { topic, description },
  });
}

export async function reportComment(commentUuid: string, topic: string, description: string) {
  await apiFetch(`/comments/${commentUuid}/report/`, {
    method: "POST",
    body: { topic, description },
  });
}

/**
 * General (no-target) report — used by the footer contact forms. Same {topic, description}
 * contract as the per-video report; the topic is a slug from /report-topics/ (e.g. "abuse",
 * "ads"). Needs backend POST /reports/.
 */
export async function submitReport(topic: string, description: string) {
  await apiFetch("/reports/", { method: "POST", body: { topic, description } });
}
