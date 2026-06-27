"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getShortsFeed,
  getShortsPageByUrl,
  type ShortsFeedParams,
  type VideoShort,
} from "@/lib/api/shorts";
import { useAuth } from "@/lib/auth/auth-context";
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";
import { ShortOverlay } from "./short-overlay";
import { ShortPlayer } from "./short-player";

const MUTED_KEY = "shorts:muted";
// Mount the player for the active slide ± this many; render a poster-only placeholder beyond it.
const PLAY_RADIUS = 1;
const CONTENT_RADIUS = 2;
// Prefetch the next page when the active slide is within this many of the end of the buffer.
const PREFETCH_GAP = 4;
// Scroll container height on desktop = viewport minus the sticky header (h-14 = 3.5rem).
const DESKTOP_H = "h-[calc(100dvh-3.5rem)]";

/** Deep-link seed (from the SSR detail of /shorts/<slug>) — shown as the first slide. */
export interface InitialShort {
  uuid: string;
  slug: string;
  title: string;
  poster: string | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
}

export function ShortsFeed({
  scope = {},
  initialVideo,
  lang,
}: {
  scope?: Pick<ShortsFeedParams, "categories" | "include_tags" | "actors">;
  initialVideo?: InitialShort;
  lang?: string;
}) {
  const t = useTranslations("shorts");
  const { getToken } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // Desktop renders an in-chrome layout; mobile keeps the full-screen swipe feed.
  const isWide = useMediaQuery("(min-width: 1024px)");
  const mounted = useMounted();
  const desktop = mounted && isWide;

  // Default muted for autoplay policies; restore the session preference lazily on the client.
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(MUTED_KEY) !== "off";
  });
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      sessionStorage.setItem(MUTED_KEY, next ? "on" : "off");
      return next;
    });
  }, []);

  const params: ShortsFeedParams = useMemo(
    () => ({ lang: lang as ShortsFeedParams["lang"], page_size: 24, ...scope }),
    [lang, scope],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["shorts", params],
    queryFn: ({ pageParam }) =>
      pageParam
        ? getShortsPageByUrl(pageParam, getToken())
        : getShortsFeed(params, { token: getToken() }),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });

  // Merge the deep-link seed in front of the fetched feed (deduped by uuid).
  const list = useMemo<VideoShort[]>(() => {
    const fetched = (data?.pages ?? []).flatMap((p) => p.results);
    if (!initialVideo) return fetched;
    const seed: VideoShort = {
      uuid: initialVideo.uuid,
      slug: initialVideo.slug,
      title: initialVideo.title,
      poster: initialVideo.poster,
      duration: 0,
      views_count: 0,
      likes_count: initialVideo.likes_count,
      dislikes_count: initialVideo.dislikes_count,
      comments_count: initialVideo.comments_count,
      published_at: null,
      trailer: null,
      language: lang ?? "",
      is_vertical: true,
    };
    return [seed, ...fetched.filter((v) => v.uuid !== seed.uuid)];
  }, [data, initialVideo, lang]);

  // Track the active slide via IntersectionObserver (the one ≥60% in view). Re-binds on layout swap.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root, threshold: [0.6] },
    );
    for (const el of slideRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [list.length, desktop]);

  // Prefetch the next page as the user nears the end of the buffer.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && active >= list.length - PREFETCH_GAP) {
      void fetchNextPage();
    }
  }, [active, list.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const goTo = useCallback((index: number) => {
    const el = slideRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Keyboard: ↑/↓ navigate, Space play/pause, M mute.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        goTo(Math.min(active + 1, list.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goTo(Math.max(active - 1, 0));
      } else if (e.key === " ") {
        e.preventDefault();
        const video = slideRefs.current[active]?.querySelector("video");
        if (video) (video.paused ? video.play() : video.pause())?.catch?.(() => undefined);
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, list.length, goTo, toggleMute]);

  // Mouse-wheel: one notch = one slide (debounced so a single flick doesn't skip several).
  const wheelLock = useRef(false);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      setTimeout(() => (wheelLock.current = false), 600);
      goTo(e.deltaY > 0 ? Math.min(active + 1, list.length - 1) : Math.max(active - 1, 0));
    }
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [active, list.length, goTo, desktop]);

  const setSlideRef = (i: number) => (el: HTMLDivElement | null) => {
    slideRefs.current[i] = el;
  };
  const onSlideError = (i: number) => () => goTo(Math.min(i + 1, list.length - 1));
  const onSlideEnded = (i: number) => () => goTo(Math.min(i + 1, list.length - 1));

  // ----- Empty feed (no verticals / everything watched) -----
  if (!isLoading && list.length === 0) {
    const cta = (
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg font-semibold">{t("emptyTitle")}</p>
        <Link
          href="/"
          className="bg-accent text-on-accent hover:bg-accent-hover rounded-full px-5 py-2 text-sm font-medium"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
    return desktop ? (
      <div className={cn("grid place-items-center px-6 text-center", DESKTOP_H)}>{cta}</div>
    ) : (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white">
        <Link
          href="/"
          aria-label={t("close")}
          className="fixed top-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur"
        >
          <X size={20} />
        </Link>
        {cta}
      </div>
    );
  }

  // ----- Desktop: in-chrome, centered 9:16 player + side rail + ↑/↓ nav -----
  if (desktop) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "snap-y snap-mandatory [scrollbar-width:none] overflow-y-scroll overscroll-y-contain scroll-smooth [&::-webkit-scrollbar]:hidden",
          DESKTOP_H,
        )}
      >
        {list.map((video, i) => {
          const within = Math.abs(i - active) <= CONTENT_RADIUS;
          const play = Math.abs(i - active) <= PLAY_RADIUS;
          return (
            <div
              key={video.uuid}
              ref={setSlideRef(i)}
              data-index={i}
              className={cn(
                "flex snap-start items-center justify-center gap-4 px-4 py-3",
                DESKTOP_H,
              )}
            >
              {/* 9:16 player, height-bound (definite height → width follows). */}
              <div className="relative aspect-[9/16] h-full overflow-hidden rounded-2xl bg-black">
                {play ? (
                  <ShortPlayer
                    uuid={video.uuid}
                    active={i === active}
                    muted={muted}
                    chrome
                    onToggleMute={toggleMute}
                    onError={onSlideError(i)}
                    onEnded={onSlideEnded(i)}
                  />
                ) : null}
              </div>
              {/* Action rail — bottom-aligned beside the video. */}
              {within ? (
                <div className="flex h-full flex-col justify-end pb-1">
                  <ShortOverlay
                    variant="side"
                    uuid={video.uuid}
                    slug={video.slug}
                    title={video.title}
                    likesCount={video.likes_count}
                    dislikesCount={video.dislikes_count}
                    commentsCount={video.comments_count}
                    muted={muted}
                    onToggleMute={toggleMute}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {!hasNextPage && list.length > 0 ? (
          <div className={cn("grid snap-start place-items-center px-6 text-center", DESKTOP_H)}>
            <p className="text-muted text-sm">{t("endOfFeed")}</p>
          </div>
        ) : null}

        {/* Up/down navigation. */}
        <div className="fixed top-1/2 right-6 z-30 flex -translate-y-1/2 flex-col gap-3">
          <button
            type="button"
            aria-label={t("scrollPrev")}
            onClick={() => goTo(Math.max(active - 1, 0))}
            disabled={active === 0}
            className="border-border bg-surface hover:bg-surface-2 grid h-11 w-11 place-items-center rounded-full border shadow disabled:opacity-40"
          >
            <ChevronUp size={20} />
          </button>
          <button
            type="button"
            aria-label={t("scrollNext")}
            onClick={() => goTo(Math.min(active + 1, list.length - 1))}
            className="border-border bg-surface hover:bg-surface-2 grid h-11 w-11 place-items-center rounded-full border shadow"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
    );
  }

  // ----- Mobile: full-screen swipe feed (covers the chrome) -----
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 snap-y snap-mandatory [scrollbar-width:none] overflow-y-scroll overscroll-y-contain scroll-smooth bg-black [&::-webkit-scrollbar]:hidden"
    >
      <Link
        href="/"
        aria-label={t("close")}
        className="fixed top-3 left-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55"
      >
        <X size={20} />
      </Link>
      {list.map((video, i) => {
        const within = Math.abs(i - active) <= CONTENT_RADIUS;
        const play = Math.abs(i - active) <= PLAY_RADIUS;
        return (
          <div
            key={video.uuid}
            ref={setSlideRef(i)}
            data-index={i}
            className="relative mx-auto h-[100dvh] w-full snap-start"
          >
            {play ? (
              <ShortPlayer
                uuid={video.uuid}
                active={i === active}
                muted={muted}
                onError={onSlideError(i)}
                onEnded={onSlideEnded(i)}
              />
            ) : null}

            {within ? (
              <ShortOverlay
                uuid={video.uuid}
                slug={video.slug}
                title={video.title}
                likesCount={video.likes_count}
                dislikesCount={video.dislikes_count}
                commentsCount={video.comments_count}
                muted={muted}
                onToggleMute={toggleMute}
              />
            ) : null}
          </div>
        );
      })}

      {!hasNextPage && list.length > 0 ? (
        <div className="grid h-[100dvh] snap-start place-items-center bg-black px-6 text-center text-white/70">
          <p className="text-sm">{t("endOfFeed")}</p>
        </div>
      ) : null}
    </div>
  );
}
