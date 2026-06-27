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
import { ShortComments } from "./short-comments";

const GUEST_LIKE_TTL = 1000 * 60 * 60 * 24 * 7;

function guestLikedRecently(uuid: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(`gl:${uuid}`);
  return raw ? Date.now() - Number(raw) < GUEST_LIKE_TTL : false;
}

/** A round action button with a count underneath. `tone` adapts it to over-video vs on-page. */
function RailButton({
  icon,
  label,
  count,
  active,
  onClick,
  tone = "dark",
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  tone?: "dark" | "surface";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full transition-colors",
          tone === "dark"
            ? "bg-black/35 backdrop-blur"
            : "border-border bg-surface hover:bg-surface-2 border",
          active
            ? "text-accent"
            : tone === "dark"
              ? "text-white hover:bg-black/55"
              : "text-foreground",
        )}
      >
        {icon}
      </span>
      {count !== undefined ? (
        <span
          className={cn(
            "text-xs font-semibold",
            tone === "dark" ? "text-white drop-shadow" : "text-muted",
          )}
        >
          {formatCount(count)}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Action controls for one short: like / dislike / favorite / comments / share, reusing the catalog
 * reaction + favorite machinery (optimistic + batch state). `variant="overlay"` (mobile) overlays a
 * right rail + a bottom title/mute block; `variant="side"` (desktop) renders a plain vertical rail
 * (incl. mute) to place beside the player — the desktop layout shows the title separately.
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
  variant = "overlay",
}: {
  uuid: string;
  slug: string;
  title: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  muted: boolean;
  onToggleMute: () => void;
  variant?: "overlay" | "side";
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
  const [commentsOpen, setCommentsOpen] = useState(false);
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

  const tone = variant === "side" ? "surface" : "dark";

  const likeBtn = (
    <RailButton
      icon={
        <ThumbsUp size={22} fill={myReaction === "like" || guestLiked ? "currentColor" : "none"} />
      }
      label={t("like")}
      count={likes}
      active={myReaction === "like" || guestLiked}
      onClick={handleLike}
      tone={tone}
    />
  );
  const dislikeBtn = (
    <RailButton
      icon={<ThumbsDown size={22} fill={myReaction === "dislike" ? "currentColor" : "none"} />}
      label={t("dislike")}
      count={dislikes}
      active={myReaction === "dislike"}
      onClick={handleDislike}
      tone={tone}
    />
  );
  const favBtn = (
    <RailButton
      icon={<Bookmark size={22} fill={favorited ? "currentColor" : "none"} />}
      label={t("favorite")}
      active={favorited}
      onClick={handleFavorite}
      tone={tone}
    />
  );
  const commentsBtn = (
    <RailButton
      icon={<MessageCircle size={22} />}
      label={t("comments")}
      count={commentsCount}
      onClick={() => setCommentsOpen(true)}
      tone={tone}
    />
  );
  const shareBtn = (
    <RailButton icon={<Share2 size={22} />} label={t("share")} onClick={handleShare} tone={tone} />
  );

  const commentsPanel = (
    <ShortComments
      uuid={uuid}
      commentsCount={commentsCount}
      open={commentsOpen}
      onOpenChange={setCommentsOpen}
    />
  );

  // Desktop: plain vertical rail beside the player (Like / Bookmark / Comments / Share).
  // Mute lives in the on-video top-left chrome, so it's intentionally not repeated here.
  if (variant === "side") {
    return (
      <>
        <div className="flex flex-col items-center gap-4">
          {likeBtn}
          {favBtn}
          {commentsBtn}
          {shareBtn}
        </div>
        {commentsPanel}
      </>
    );
  }

  // Mobile: overlaid right rail + bottom title/mute block.
  return (
    <>
      <div className="absolute right-2 bottom-24 z-10 flex flex-col items-center gap-4">
        {likeBtn}
        {dislikeBtn}
        {favBtn}
        {commentsBtn}
        {shareBtn}
      </div>
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
      {commentsPanel}
    </>
  );
}
