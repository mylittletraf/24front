import { z } from "zod";
import { apiFetch, toProxyUrl } from "./fetcher";
import { parseList, type CursorPage } from "./types";
import { ApiError } from "./errors";

export type CommentSort = "top" | "new" | "old";

export const CommentSchema = z.object({
  uuid: z.string(),
  text: z.string(),
  author: z.string().nullable(),
  likes_count: z.number(),
  dislikes_count: z.number(),
  created_at: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

export async function getComments(
  videoUuid: string,
  sort: CommentSort = "top",
): Promise<CursorPage<Comment>> {
  const data = await apiFetch<unknown>(`/videos/${videoUuid}/comments/`, {
    params: { sort },
    cache: "no-store",
  });
  const { next, previous, results } = parseList(CommentSchema, data);
  return { next, previous, results };
}

export async function getCommentsPageByUrl(url: string): Promise<CursorPage<Comment>> {
  const res = await fetch(toProxyUrl(url), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const { next, previous, results } = parseList(CommentSchema, await res.json());
  return { next, previous, results };
}

export async function postComment(
  videoUuid: string,
  text: string,
  token: string,
): Promise<Comment> {
  const data = await apiFetch<unknown>(`/videos/${videoUuid}/comments/`, {
    method: "POST",
    body: { text },
    token,
  });
  return CommentSchema.parse(data);
}

export async function reactToComment(
  commentUuid: string,
  reaction: "like" | "dislike",
  token: string,
): Promise<void> {
  await apiFetch(`/comments/${commentUuid}/${reaction}/`, { method: "POST", token });
}

export async function removeCommentReaction(commentUuid: string, token: string): Promise<void> {
  await apiFetch(`/comments/${commentUuid}/reaction/`, { method: "DELETE", token });
}

export async function deleteComment(commentUuid: string, token: string): Promise<void> {
  await apiFetch(`/comments/${commentUuid}/`, { method: "DELETE", token });
}
