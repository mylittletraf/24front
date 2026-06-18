"use client";

import { Bookmark, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { useVideoState } from "@/components/video/video-state-context";
import { Button } from "@/components/ui/button";
import { clearReaction, postGuestLike, setReaction } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { useReaction, type Reaction } from "@/lib/hooks/use-reaction";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";
import { toastApiError } from "@/lib/toast-error";

const GUEST_LIKE_TTL = 1000 * 60 * 60 * 24 * 7;

function guestLikedRecently(uuid: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(`gl:${uuid}`);
  return raw ? Date.now() - Number(raw) < GUEST_LIKE_TTL : false;
}

function ReactionBar({
  uuid,
  likesCount,
  dislikesCount,
  initialReaction,
}: {
  uuid: string;
  likesCount: number;
  dislikesCount: number;
  initialReaction: Reaction;
}) {
  const { isAuthenticated, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const { setReaction: cacheReaction } = useVideoState();
  const [guestLiked, setGuestLiked] = useState(() => guestLikedRecently(uuid));

  const {
    reaction: myReaction,
    likes: reactionLikes,
    dislikes,
    like,
    dislike,
  } = useReaction({
    likesCount,
    dislikesCount,
    initial: initialReaction,
    sync: (next) => {
      const token = getToken();
      if (!token) return Promise.reject(new Error("unauthorized"));
      return next === null ? clearReaction(uuid, token) : setReaction(uuid, next, token);
    },
    onError: (error) => toastApiError(error, { onUnauthorized: () => openAuth("login") }),
  });

  // Keep the shared cache in sync once the user changes their reaction.
  const lastCached = useRef(initialReaction);
  useEffect(() => {
    if (myReaction !== lastCached.current) {
      lastCached.current = myReaction;
      cacheReaction(uuid, myReaction);
    }
  }, [myReaction, uuid, cacheReaction]);

  const likes = reactionLikes + (guestLiked ? 1 : 0);

  function handleLike() {
    if (!isAuthenticated) {
      if (guestLiked) {
        openAuth("login");
        return;
      }
      setGuestLiked(true);
      localStorage.setItem(`gl:${uuid}`, String(Date.now()));
      postGuestLike(uuid).catch((error) => toastApiError(error));
      return;
    }
    like();
  }

  function handleDislike() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    dislike();
  }

  return (
    <div className="bg-surface flex overflow-hidden rounded-full">
      <button
        type="button"
        onClick={handleLike}
        className={cn(
          "hover:bg-surface-2 flex items-center gap-1.5 px-4 py-2 text-sm font-medium",
          myReaction === "like" && "text-accent",
        )}
      >
        <ThumbsUp size={18} />
        {formatCount(likes)}
      </button>
      <span className="bg-border my-2 w-px" />
      <button
        type="button"
        onClick={handleDislike}
        className={cn(
          "hover:bg-surface-2 flex items-center gap-1.5 px-4 py-2 text-sm font-medium",
          myReaction === "dislike" && "text-accent",
        )}
      >
        <ThumbsDown size={18} />
        {formatCount(dislikes)}
      </button>
    </div>
  );
}

export function VideoActions({
  uuid,
  likesCount,
  dislikesCount,
  favoritesCount,
}: {
  uuid: string;
  likesCount: number;
  dislikesCount: number;
  favoritesCount: number;
}) {
  const { isAuthenticated } = useAuth();
  const { open: openAuth } = useAuthUI();
  const { register, isFavorite, getReaction, toggleFavorite } = useVideoState();

  useEffect(() => register([uuid]), [uuid, register]);

  const favorited = isAuthenticated && isFavorite(uuid);
  const initialReaction = getReaction(uuid);

  function handleFavorite() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    toggleFavorite(uuid);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Re-seed the reaction once the user's state loads (key changes null -> like/dislike). */}
      <ReactionBar
        key={`${uuid}:${initialReaction ?? "none"}`}
        uuid={uuid}
        likesCount={likesCount}
        dislikesCount={dislikesCount}
        initialReaction={initialReaction}
      />

      <Button variant={favorited ? "primary" : "secondary"} onClick={handleFavorite}>
        <Bookmark size={18} fill={favorited ? "currentColor" : "none"} />
        {formatCount(favoritesCount)}
      </Button>
    </div>
  );
}
