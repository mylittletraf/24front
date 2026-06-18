"use client";

import "video.js/dist/video-js.css";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type Player from "video.js/dist/types/player";
import { getVast, postProgress, postView } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { frequencyOk } from "@/lib/ads";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";

const PROGRESS_INTERVAL_MS = 15000;
const CLICKUNDER_ON_NTH_PLAY = 3; // open the clickunder on the Nth play, not the first

// --- VAST via Google IMA (videojs-contrib-ads + videojs-ima) -----------------------------
interface ImaApi {
  (opts: { adTagUrl: string }): void;
  changeAdTag: (url: string) => void;
  requestAds: () => void;
}
type ImaPlayer = Player & { ima?: ImaApi };

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

/** Wire VAST pre/post-roll. Any failure (no SDK, 204, plugin error) leaves content playing. */
async function setupVastAds(player: Player, uuid: string): Promise<void> {
  try {
    const [preroll, postroll] = await Promise.all([
      getVast(uuid, "pre_roll"),
      getVast(uuid, "post_roll"),
    ]);
    if (!preroll && !postroll) return; // 204/204 — no ads
    await loadImaSdk();
    await import("videojs-contrib-ads");
    await import("videojs-ima");
    const p = player as ImaPlayer;
    if (typeof p.ima !== "function") return;
    p.ima({ adTagUrl: preroll ?? (postroll as string) });
    if (preroll && postroll) {
      // Postroll: swap the tag and request a fresh ad when the content ends.
      player.one("ended", () => {
        try {
          p.ima?.changeAdTag(postroll);
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

export function VideoPlayer({
  uuid,
  hls,
  poster,
  resumeSeconds = 0,
}: {
  uuid: string;
  hls: string | null;
  poster: string | null;
  resumeSeconds?: number;
}) {
  const t = useTranslations("video");
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const { getToken } = useAuth();
  const viewedRef = useRef(false);

  // Clickunder (popunder) — direct link in the slot's `script`, opened on the Nth Play.
  const clickunder = useAdSlot("clickander_play");
  const clickunderRef = useRef<string | null>(null);
  const playCountRef = useRef(0);
  useEffect(() => {
    clickunderRef.current = clickunder?.script || null;
  }, [clickunder]);

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

      const videoEl = document.createElement("video-js");
      videoEl.classList.add("video-js", "vjs-big-play-centered");
      containerRef.current.appendChild(videoEl);

      const player = videojs(videoEl, {
        controls: true,
        preload: "auto",
        responsive: true,
        fluid: true,
        aspectRatio: "16:9",
        poster: poster ?? undefined,
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [{ src: hls, type: "application/x-mpegURL" }],
      });
      playerRef.current = player;

      // VAST pre/post-roll (no-op when the backend returns 204).
      void setupVastAds(player, uuid);

      if (resumeSeconds > 0) {
        player.one("loadedmetadata", () => player.currentTime(resumeSeconds));
      }

      player.one("play", () => {
        if (!viewedRef.current) {
          viewedRef.current = true;
          void postView(uuid, getToken());
        }
      });

      player.on("play", () => {
        clearInterval(progressTimer);
        progressTimer = setInterval(sendProgress, PROGRESS_INTERVAL_MS);

        // Clickunder: open the direct link on the Nth play, once per day (popunder).
        playCountRef.current += 1;
        if (playCountRef.current === CLICKUNDER_ON_NTH_PLAY) {
          const link = clickunderRef.current;
          if (link && frequencyOk("clickander_play", 1)) {
            const w = window.open(link, "_blank", "noopener");
            try {
              w?.blur?.();
              window.focus();
            } catch {
              // ignore
            }
          }
        }
      });
      player.on("pause", () => {
        clearInterval(progressTimer);
        sendProgress();
      });
      player.on("ended", () => clearInterval(progressTimer));

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
  }, [hls, poster, uuid, resumeSeconds, getToken]);

  if (!hls) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-xl bg-black text-white">
        {t("unavailable")}
      </div>
    );
  }

  return (
    <div data-vjs-player className="w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
