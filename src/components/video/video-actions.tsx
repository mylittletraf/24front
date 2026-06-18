"use client";

import { Bookmark, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import {
  addFavorite,
  clearReaction,
  postGuestLike,
  removeFavorite,
  setReaction,
  type Reaction,
} from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";
import { toastApiError } from "@/lib/toast-error";

const GUEST_LIKE_TTL = 1000 * 60 * 60 * 24 * 7;

function guestLikedRecently(uuid: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(`gl:${uuid}`);
  return raw ? Date.now() - Number(raw) < GUEST_LIKE_TTL : false;
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
  const { isAuthenticated, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();

  const [likes, setLikes] = useState(likesCount);
  const [dislikes, setDislikes] = useState(dislikesCount);
  const [favorites, setFavorites] = useState(favoritesCount);
  const [myReaction, setMyReaction] = useState<Reaction | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [guestLiked, setGuestLiked] = useState(() => guestLikedRecently(uuid));

  async function handleLike() {
    if (!isAuthenticated) {
      if (guestLiked) {
        openAuth("login");
        return;
      }
      setLikes((n) => n + 1);
      setGuestLiked(true);
      localStorage.setItem(`gl:${uuid}`, String(Date.now()));
      try {
        await postGuestLike(uuid);
      } catch (error) {
        toastApiError(error);
      }
      return;
    }
    const token = getToken();
    if (!token) return;
    const prev = myReaction;
    if (prev === "like") {
      setMyReaction(null);
      setLikes((n) => n - 1);
      try {
        await clearReaction(uuid, token);
      } catch (error) {
        setMyReaction(prev);
        setLikes((n) => n + 1);
        toastApiError(error, { onUnauthorized: () => openAuth("login") });
      }
      return;
    }
    setMyReaction("like");
    setLikes((n) => n + 1);
    if (prev === "dislike") setDislikes((n) => n - 1);
    try {
      await setReaction(uuid, "like", token);
    } catch (error) {
      setMyReaction(prev);
      setLikes((n) => n - 1);
      if (prev === "dislike") setDislikes((n) => n + 1);
      toastApiError(error, { onUnauthorized: () => openAuth("login") });
    }
  }

  async function handleDislike() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    const token = getToken();
    if (!token) return;
    const prev = myReaction;
    if (prev === "dislike") {
      setMyReaction(null);
      setDislikes((n) => n - 1);
      try {
        await clearReaction(uuid, token);
      } catch (error) {
        setMyReaction(prev);
        setDislikes((n) => n + 1);
        toastApiError(error, { onUnauthorized: () => openAuth("login") });
      }
      return;
    }
    setMyReaction("dislike");
    setDislikes((n) => n + 1);
    if (prev === "like") setLikes((n) => n - 1);
    try {
      await setReaction(uuid, "dislike", token);
    } catch (error) {
      setMyReaction(prev);
      setDislikes((n) => n - 1);
      if (prev === "like") setLikes((n) => n + 1);
      toastApiError(error, { onUnauthorized: () => openAuth("login") });
    }
  }

  async function handleFavorite() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    const token = getToken();
    if (!token) return;
    const next = !favorited;
    setFavorited(next);
    setFavorites((n) => n + (next ? 1 : -1));
    try {
      if (next) await addFavorite(uuid, token);
      else await removeFavorite(uuid, token);
      toast.success(next ? "Добавлено в избранное" : "Удалено из избранного");
    } catch (error) {
      setFavorited(!next);
      setFavorites((n) => n + (next ? -1 : 1));
      toastApiError(error, { onUnauthorized: () => openAuth("login") });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      <Button variant={favorited ? "primary" : "secondary"} onClick={handleFavorite}>
        <Bookmark size={18} fill={favorited ? "currentColor" : "none"} />
        {formatCount(favorites)}
      </Button>
    </div>
  );
}
