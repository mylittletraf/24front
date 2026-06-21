"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import {
  deleteComment,
  getComments,
  getCommentsPageByUrl,
  postComment,
  reactToComment,
  removeCommentReaction,
  type Comment,
} from "@/lib/api/comments";
import { useAuth } from "@/lib/auth/auth-context";
import { useReaction } from "@/lib/hooks/use-reaction";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils/cn";
import { formatCount, formatRelativeDate } from "@/lib/utils/format";
import { toastApiError } from "@/lib/toast-error";

export function CommentsSection({
  videoUuid,
  commentsCount,
}: {
  videoUuid: string;
  commentsCount: number;
}) {
  const t = useTranslations("video");
  const tCommon = useTranslations("common");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["comments", videoUuid],
      queryFn: ({ pageParam }) =>
        pageParam ? getCommentsPageByUrl(pageParam) : getComments(videoUuid),
      initialPageParam: null as string | null,
      getNextPageParam: (last) => last.next,
    });

  const comments = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <section className="border-border bg-surface/40 desktop:p-5 flex flex-col gap-4 rounded-2xl border p-4">
      <h2 className="heading-rail text-lg font-semibold">
        {t("comments")} ({commentsCount})
      </h2>

      <CommentForm videoUuid={videoUuid} onPosted={() => refetch()} />

      {!isLoading && comments.length === 0 ? (
        <p className="text-muted py-4 text-sm">{t("noComments")}</p>
      ) : null}

      <ul className="divide-border flex flex-col divide-y">
        {comments.map((comment) => (
          <CommentItem key={comment.uuid} comment={comment} />
        ))}
      </ul>

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {tCommon("loadMore")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function CommentForm({ videoUuid, onPosted }: { videoUuid: string; onPosted: () => void }) {
  const t = useTranslations("video");
  const { isAuthenticated, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => openAuth("login")}
        className="bg-background text-muted hover:bg-surface-2 border-border rounded-xl border p-3 text-left text-sm"
      >
        {t("loginToComment")}
      </button>
    );
  }

  async function submit() {
    const value = text.trim();
    const token = getToken();
    if (!value || !token) return;
    setSubmitting(true);
    try {
      await postComment(videoUuid, value, token);
      setText("");
      toast.success(t("sentForModeration"));
      onPosted();
    } catch (error) {
      toastApiError(error, { onUnauthorized: () => openAuth("login") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={t("commentPlaceholder")}
        className="border-border bg-background focus:border-muted resize-none rounded-lg border p-3 text-sm outline-none"
      />
      <div className="flex justify-end">
        <Button variant="primary" size="sm" onClick={submit} disabled={submitting || !text.trim()}>
          {t("send")}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const t = useTranslations("video");
  const locale = useLocale() as Locale;
  const { isAuthenticated, getToken, user } = useAuth();
  const { open: openAuth } = useAuthUI();

  const [removed, setRemoved] = useState(false);

  const canDelete =
    isAuthenticated && comment.author !== null && comment.author === user?.display_name;

  const {
    reaction: myReaction,
    likes,
    dislikes,
    like,
    dislike,
  } = useReaction({
    likesCount: comment.likes_count,
    dislikesCount: comment.dislikes_count,
    sync: (next) => {
      const token = getToken();
      if (!token) return Promise.reject(new Error("unauthorized"));
      return next === null
        ? removeCommentReaction(comment.uuid, token)
        : reactToComment(comment.uuid, next, token);
    },
    onError: (error) => toastApiError(error, { onUnauthorized: () => openAuth("login") }),
  });

  function react(target: "like" | "dislike") {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    if (target === "like") like();
    else dislike();
  }

  async function remove() {
    const token = getToken();
    if (!token) return;
    setRemoved(true);
    try {
      await deleteComment(comment.uuid, token);
      toast.success(t("delete"));
    } catch (error) {
      setRemoved(false);
      toastApiError(error);
    }
  }

  if (removed) return null;

  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0">
      <div className="flex items-center gap-2 text-sm">
        <span className={cn("font-medium", comment.author === null && "text-muted")}>
          {comment.author ?? t("anon")}
        </span>
        <span className="text-muted text-xs">{formatRelativeDate(comment.created_at, locale)}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
      <div className="text-muted flex items-center gap-3">
        <button
          type="button"
          onClick={() => react("like")}
          className={cn(
            "hover:text-foreground flex items-center gap-1 text-xs",
            myReaction === "like" && "text-accent",
          )}
        >
          <ThumbsUp size={14} />
          {formatCount(likes)}
        </button>
        <button
          type="button"
          onClick={() => react("dislike")}
          className={cn(
            "hover:text-foreground flex items-center gap-1 text-xs",
            myReaction === "dislike" && "text-accent",
          )}
        >
          <ThumbsDown size={14} />
          {formatCount(dislikes)}
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={remove}
            className="hover:text-accent flex items-center gap-1 text-xs"
          >
            <Trash2 size={14} />
            {t("delete")}
          </button>
        ) : null}
      </div>
    </li>
  );
}
