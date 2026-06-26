"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
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
import { ShortOverlay } from "./short-overlay";
import { ShortPlayer } from "./short-player";

const MUTED_KEY = "shorts:muted";
// Mount the player for the active slide ± this many; render a poster-only placeholder beyond it.
const PLAY_RADIUS = 1;
const CONTENT_RADIUS = 2;
// Prefetch the next page when the active slide is within this many of the end of the buffer.
const PREFETCH_GAP = 4;

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

  // Track the active slide via IntersectionObserver (the one ≥60% in view).
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
  }, [list.length]);

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

  // Desktop keyboard controls: ↑/↓ navigate, Space play/pause, M mute.
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
  }, [active, list.length, goTo]);

  // Close button back to the catalog (the global header is covered by the full-screen feed).
  const closeButton = (
    <Link
      href="/"
      aria-label={t("close")}
      className="fixed top-3 left-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-black/55"
    >
      <X size={20} />
    </Link>
  );

  // Empty feed (no verticals / everything watched).
  if (!isLoading && list.length === 0) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black px-6 text-center text-white">
        {closeButton}
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">{t("emptyTitle")}</p>
          <Link
            href="/"
            className="bg-accent text-on-accent hover:bg-accent-hover rounded-full px-5 py-2 text-sm font-medium"
          >
            {t("emptyCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 snap-y snap-mandatory [scrollbar-width:none] overflow-y-scroll overscroll-y-contain bg-black [&::-webkit-scrollbar]:hidden"
    >
      {closeButton}
      {list.map((video, i) => {
        const within = Math.abs(i - active) <= CONTENT_RADIUS;
        const play = Math.abs(i - active) <= PLAY_RADIUS;
        return (
          <div
            key={video.uuid}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-index={i}
            className="desktop:max-w-[min(420px,56.25vh)] relative mx-auto h-[100dvh] w-full snap-start"
          >
            {play ? (
              <ShortPlayer
                uuid={video.uuid}
                poster={video.poster}
                active={i === active}
                muted={muted}
                onError={() => goTo(Math.min(i + 1, list.length - 1))}
              />
            ) : within && video.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
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

      {/* End-of-feed soft indicator. */}
      {!hasNextPage && list.length > 0 ? (
        <div className="grid h-[100dvh] snap-start place-items-center bg-black px-6 text-center text-white/70">
          <p className="text-sm">{t("endOfFeed")}</p>
        </div>
      ) : null}
    </div>
  );
}
