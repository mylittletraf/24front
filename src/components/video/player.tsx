"use client";

import "video.js/dist/video-js.css";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type Player from "video.js/dist/types/player";
import { track } from "@/lib/analytics/track";
import {
  getPlayback,
  getVast,
  postProgress,
  postView,
  type AdPlacement,
} from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { setupQualityMenu } from "./quality-menu";

const PROGRESS_INTERVAL_MS = 15000;

// --- VAST via Google IMA (videojs-contrib-ads + videojs-ima) -----------------------------
interface ImaApi {
  (opts: { adTagUrl: string; vpaidMode?: number }): void;
  changeAdTag: (url: string) => void;
  requestAds: () => void;
}
type ImaPlayer = Player & { ima?: ImaApi };

/** VpaidMode.INSECURE from the loaded IMA SDK — lets VPAID creatives (common on ad networks) run. */
function vpaidInsecure(): number | undefined {
  const ima = (
    window as unknown as {
      google?: { ima?: { ImaSdkSettings?: { VpaidMode?: { INSECURE?: number } } } };
    }
  ).google?.ima;
  return ima?.ImaSdkSettings?.VpaidMode?.INSECURE;
}

let imaSdkPromise: Promise<void> | null = null;
function loadImaSdk(): Promise<void> {
  const w = window as unknown as { google?: { ima?: unknown } };
  if (w.google?.ima) return Promise.resolve();
  if (imaSdkPromise) return imaSdkPromise;
  imaSdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("IMA SDK failed to load"));
    document.head.appendChild(s);
  });
  return imaSdkPromise;
}

type VastTags = { pre: string | null; post: string | null };
type VastPlacements = { pre: AdPlacement; post: AdPlacement };

/**
 * Fetch the VAST tags and load the IMA SDK + plugins — done BEFORE the player is created so the
 * ads plugin can be initialized in the same tick (contrib-ads requirement). Returns null = no ads.
 */
async function prepareVastAds(uuid: string, placements: VastPlacements): Promise<VastTags | null> {
  try {
    const [pre, post] = await Promise.all([
      getVast(uuid, placements.pre),
      getVast(uuid, placements.post),
    ]);
    if (!pre && !post) return null; // 204/204 — no ads
    await loadImaSdk();
    await import("videojs-contrib-ads");
    await import("videojs-ima");
    return { pre, post };
  } catch {
    return null;
  }
}

/** Initialize IMA synchronously (must run in the same tick as player creation, before loadstart). */
function initVastAds(player: Player, tags: VastTags): void {
  const p = player as ImaPlayer;
  if (typeof p.ima !== "function") return;
  try {
    p.ima({ adTagUrl: tags.pre ?? (tags.post as string), vpaidMode: vpaidInsecure() });
    if (tags.pre && tags.post) {
      const post = tags.post;
      // Postroll: swap the tag and request a fresh ad when the content ends.
      player.one("ended", () => {
        try {
          p.ima?.changeAdTag(post);
          p.ima?.requestAds();
        } catch {
          // ignore
        }
      });
    }
  } catch {
    // never let an ad failure break playback
  }
}

const DEFAULT_VAST: VastPlacements = { pre: "pre_roll", post: "post_roll" };

export function VideoPlayer({
  uuid,
  poster,
  resumeSeconds = 0,
  vastPlacements = DEFAULT_VAST,
  embed = false,
  aspectRatio = "16:9",
}: {
  uuid: string;
  poster: string | null;
  resumeSeconds?: number;
  /** Which VAST placements to request. The embed player uses the Yandex-only tags. */
  vastPlacements?: VastPlacements;
  /** True when rendered in the Yandex Video embed — tags the play events accordingly. */
  embed?: boolean;
  /** Player box ratio — pass "9:16" for vertical (shorts) embeds. */
  aspectRatio?: string;
}) {
  const t = useTranslations("video");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const { getToken } = useAuth();
  const viewedRef = useRef(false);

  // HLS source comes from the short-lived signed /playback/ endpoint (fetched fresh, never cached),
  // not from the ISR-cached detail. Keyed by uuid so a client-side navigation re-fetches.
  const playbackQuery = useQuery({
    queryKey: ["playback", uuid],
    queryFn: () => getPlayback(uuid, getToken()),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const hls = playbackQuery.data?.hls ?? null;
  const status = playbackQuery.isPending ? "loading" : hls ? "ready" : "error";

  // When a signed segment 403s mid-playback (token TTL expired on a long video), re-fetch a fresh
  // /playback/ URL and resume — bounded so a genuinely broken source can't loop forever.
  const reloadsRef = useRef(0);

  useEffect(() => {
    if (!hls) return;
    let disposed = false;
    let progressTimer: ReturnType<typeof setInterval> | undefined;
    let onUnload: (() => void) | undefined;

    const sendProgress = () => {
      const player = playerRef.current;
      const token = getToken();
      if (!player || !token) return;
      const current = player.currentTime() ?? 0;
      const duration = player.duration() ?? 0;
      if (!duration) return;
      void postProgress(uuid, Math.min(current / duration, 1), Math.floor(current), token);
    };

    void (async () => {
      const videojs = (await import("video.js")).default;
      if (disposed || !containerRef.current) return;

      // Resolve ads (tag + SDK + plugins) BEFORE creating the player so IMA can init in the
      // same tick as the source — otherwise contrib-ads warns "initialized too late".
      const adTags = await prepareVastAds(uuid, vastPlacements);
      if (disposed || !containerRef.current) return;

      const videoEl = document.createElement("video-js");
      videoEl.classList.add("video-js", "vjs-big-play-centered");
      containerRef.current.appendChild(videoEl);

      const player = videojs(videoEl, {
        controls: true,
        preload: "auto",
        responsive: true,
        fluid: true,
        aspectRatio,
        poster: poster ?? undefined,
      });
      playerRef.current = player;

      // Same tick: init ads (if any) BEFORE setting the source, then load the content.
      if (adTags) {
        initVastAds(player, adTags);
        // Count a VAST impression when an ad actually starts (contrib-ads event).
        player.on("ads-ad-started", () =>
          track("ad_impression", { format: "vast", placement: vastPlacements.pre }),
        );
        // Ad click-through (best-effort: depends on IMA/the network surfacing the event).
        player.on("ads-click", () =>
          track("ad_click", { format: "vast", placement: vastPlacements.pre }),
        );
      }
      player.src({ src: hls, type: "application/x-mpegURL" });

      // Recover from an expired signed source: on a media/network error, fetch a fresh playback URL
      // and resume from where we were. Reset the budget once playback is actually progressing.
      player.on("playing", () => {
        reloadsRef.current = 0;
      });
      player.on("error", () => {
        const err = player.error();
        // 1 = ABORTED (user/navigation) — don't retry; 2 = NETWORK, 3 = DECODE, 4 = SRC unsupported.
        if (!err || err.code === 1 || reloadsRef.current >= 2) return;
        reloadsRef.current += 1;
        const at = player.currentTime() ?? 0;
        void (async () => {
          const pb = await getPlayback(uuid, getToken());
          if (disposed || !pb?.hls) return;
          player.src({ src: pb.hls, type: "application/x-mpegURL" });
          player.one("loadedmetadata", () => {
            if (at > 0) player.currentTime(at);
            void player.play();
          });
        })();
      });

      // HLS resolution selector in the control bar (replaces the playback-speed menu).
      try {
        setupQualityMenu(videojs, player);
      } catch {
        // ignore — quality menu is best-effort
      }

      if (resumeSeconds > 0) {
        player.one("loadedmetadata", () => player.currentTime(resumeSeconds));
      }

      player.one("play", () => {
        if (!viewedRef.current) {
          viewedRef.current = true;
          void postView(uuid, getToken());
          track("video_play", { video_uuid: uuid, embed });
          if (embed) track("embed_play", { video_uuid: uuid });
        }
      });

      // Completion funnel: fire each quartile once (works for anon users too).
      const progressMarks = new Set<number>();
      player.on("timeupdate", () => {
        const d = player.duration() ?? 0;
        if (!d) return;
        const pct = ((player.currentTime() ?? 0) / d) * 100;
        for (const m of [25, 50, 75]) {
          if (pct >= m && !progressMarks.has(m)) {
            progressMarks.add(m);
            track(`video_progress_${m}`, { video_uuid: uuid });
          }
        }
      });

      player.on("play", () => {
        clearInterval(progressTimer);
        progressTimer = setInterval(sendProgress, PROGRESS_INTERVAL_MS);
      });
      player.on("pause", () => {
        clearInterval(progressTimer);
        sendProgress();
      });
      player.on("ended", () => {
        clearInterval(progressTimer);
        track("video_complete", { video_uuid: uuid });
      });

      onUnload = () => sendProgress();
      window.addEventListener("pagehide", onUnload);
    })();

    return () => {
      disposed = true;
      clearInterval(progressTimer);
      if (onUnload) window.removeEventListener("pagehide", onUnload);
      playerRef.current?.dispose();
      playerRef.current = null;
    };
    // Depend on the placement values (not the object identity) so an inline prop doesn't recreate the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hls,
    poster,
    uuid,
    resumeSeconds,
    getToken,
    embed,
    aspectRatio,
    vastPlacements.pre,
    vastPlacements.post,
  ]);

  if (status === "error") {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl bg-black text-white">
        {t("unavailable")}
      </div>
    );
  }

  return (
    <div data-vjs-player className="relative w-full overflow-hidden rounded-xl bg-black">
      {/* Placeholder (poster) until the signed source resolves — keeps the 16:9 box, no layout jump. */}
      {!hls ? (
        <div className="grid aspect-video w-full place-items-center">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-contain" />
          ) : null}
        </div>
      ) : null}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
