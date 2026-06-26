"use client";

import {
  Bookmark,
  MessageCircle,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { useVideoState } from "@/components/video/video-state-context";
import { track } from "@/lib/analytics/track";
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

/** A round overlay action button with a count underneath (TikTok-style right rail). */
function RailButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex flex-col items-center gap-1 text-white"
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full bg-black/35 backdrop-blur transition-colors",
          active ? "text-accent" : "text-white hover:bg-black/55",
        )}
      >
        {icon}
      </span>
      {count !== undefined ? (
        <span className="text-xs font-semibold drop-shadow">{formatCount(count)}</span>
      ) : null}
    </button>
  );
}

/**
 * The action overlay for one short: right rail (like / dislike / favorite / comments / share) and a
 * bottom block (title + mute toggle). Reuses the catalog reaction + favorite machinery
 * (optimistic + batch state). The comments sheet is a follow-up — the count is shown read-only.
 */
export function ShortOverlay({
  uuid,
  slug,
  title,
  likesCount,
  dislikesCount,
  commentsCount,
  muted,
  onToggleMute,
}: {
  uuid: string;
  slug: string;
  title: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const t = useTranslations("shorts");
  const { isAuthenticated, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const {
    register,
    isFavorite,
    getReaction,
    toggleFavorite,
    setReaction: cacheReaction,
  } = useVideoState();

  useEffect(() => register([uuid]), [uuid, register]);

  const [guestLiked, setGuestLiked] = useState(() => guestLikedRecently(uuid));
  const initialReaction = getReaction(uuid);

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

  // Mirror reaction changes into the shared cache.
  const lastCached = useRef<Reaction>(initialReaction);
  useEffect(() => {
    if (myReaction !== lastCached.current) {
      lastCached.current = myReaction;
      cacheReaction(uuid, myReaction);
    }
  }, [myReaction, uuid, cacheReaction]);

  const favorited = isAuthenticated && isFavorite(uuid);
  const likes = reactionLikes + (guestLiked ? 1 : 0);

  function handleLike() {
    if (!isAuthenticated) {
      if (guestLiked) {
        openAuth("login");
        return;
      }
      setGuestLiked(true);
      localStorage.setItem(`gl:${uuid}`, String(Date.now()));
      track("video_reaction", { type: "like", video_uuid: uuid, guest: true, shorts: true });
      postGuestLike(uuid).catch((error) => toastApiError(error));
      return;
    }
    track("video_reaction", { type: "like", video_uuid: uuid, shorts: true });
    like();
  }

  function handleDislike() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    track("video_reaction", { type: "dislike", video_uuid: uuid, shorts: true });
    dislike();
  }

  function handleFavorite() {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    track("video_favorite", { video_uuid: uuid, active: !favorited, shorts: true });
    toggleFavorite(uuid);
  }

  async function handleShare() {
    const url = `${window.location.origin}/shorts/${slug}`;
    track("share", { video_uuid: uuid, shorts: true });
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user dismissed / unsupported — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <>
      {/* Right action rail. */}
      <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center gap-4">
        <RailButton
          icon={
            <ThumbsUp
              size={22}
              fill={myReaction === "like" || guestLiked ? "currentColor" : "none"}
            />
          }
          label={t("like")}
          count={likes}
          active={myReaction === "like" || guestLiked}
          onClick={handleLike}
        />
        <RailButton
          icon={<ThumbsDown size={22} fill={myReaction === "dislike" ? "currentColor" : "none"} />}
          label={t("dislike")}
          count={dislikes}
          active={myReaction === "dislike"}
          onClick={handleDislike}
        />
        <RailButton
          icon={<Bookmark size={22} fill={favorited ? "currentColor" : "none"} />}
          label={t("favorite")}
          active={favorited}
          onClick={handleFavorite}
        />
        <RailButton
          icon={<MessageCircle size={22} />}
          label={t("comments")}
          count={commentsCount}
        />
        <RailButton icon={<Share2 size={22} />} label={t("share")} onClick={handleShare} />
      </div>

      {/* Bottom block: title + mute toggle. */}
      <div className="absolute right-0 bottom-0 left-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 pb-6">
        <h2 className="line-clamp-2 max-w-[80%] text-sm font-semibold text-white drop-shadow">
          {title}
        </h2>
        <button
          type="button"
          aria-label={muted ? t("unmute") : t("mute")}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </>
  );
}
