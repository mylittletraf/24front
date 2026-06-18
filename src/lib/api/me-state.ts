import { z } from "zod";
import { apiFetch } from "./fetcher";

export const VideoStateSchema = z.object({
  favorited: z.boolean(),
  reaction: z.enum(["like", "dislike"]).nullable(),
});
export type VideoState = z.infer<typeof VideoStateSchema>;

const StateMapSchema = z.record(z.string(), VideoStateSchema);

/** Per-video {favorited, reaction} for the current user, batched (≤200 uuids). */
export async function getVideosState(
  uuids: string[],
  token: string,
): Promise<Record<string, VideoState>> {
  if (uuids.length === 0) return {};
  const data = await apiFetch<unknown>("/me/videos/state/", {
    method: "POST",
    body: { uuids: uuids.slice(0, 200) },
    token,
  });
  const parsed = StateMapSchema.safeParse(data);
  return parsed.success ? parsed.data : {};
}
