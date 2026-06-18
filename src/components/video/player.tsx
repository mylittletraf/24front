"use client";

import "video.js/dist/video-js.css";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type Player from "video.js/dist/types/player";
import { getVast, postProgress, postView } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";

const PROGRESS_INTERVAL_MS = 15000;

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

      // VAST pre-roll lookup. 204 → null → play main immediately (the common case).
      // A returned tag URL is the integration point for an IMA/ads plugin.
      void getVast(uuid, "pre_roll");

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

      if (resumeSeconds > 0) {
        player.one("loadedmetadata", () => player.currentTime(resumeSeconds));
      }

      player.one("play", () => {
        if (!viewedRef.current) {
          viewedRef.current = true;
          void postView(uuid);
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
