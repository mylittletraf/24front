"use client";

import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { getPlayback, postProgress, postView } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { attachHls } from "@/lib/hls/attach-hls";

const PROGRESS_INTERVAL_MS = 15000;
// Count a view once the slide has been actively watched for this long (stickiness threshold, §4.5).
const VIEW_THRESHOLD_MS = 2000;

/**
 * One slide's `<video>`. The signed HLS comes from `/videos/{uuid}/playback/` (the master playlist
 * baked into the feed is null); it's fetched whenever the slide is mounted, so the feed mounting
 * active ±1 naturally preloads neighbours. Plays only while `active`; loops, muted-by-default.
 */
export function ShortPlayer({
  uuid,
  poster,
  active,
  muted,
  onError,
}: {
  uuid: string;
  poster: string | null;
  active: boolean;
  muted: boolean;
  /** Fatal HLS error → feed auto-skips to the next slide. */
  onError?: () => void;
}) {
  const { getToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  // Signed playback URL (no-store on the network, cached in memory by uuid so a re-mount reuses it).
  const playbackQuery = useQuery({
    queryKey: ["playback", uuid],
    queryFn: () => getPlayback(uuid, getToken()),
    staleTime: 60_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const hls = playbackQuery.data?.hls ?? null;

  // Attach / detach HLS when the source resolves.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hls) return;
    const detach = attachHls(video, hls, { onError });
    return detach;
  }, [hls, onError]);

  // Reflect the feed-level mute preference.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  // Play only the active slide; pause + rewind the rest.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active && hls) {
      video.muted = muted;
      const p = video.play();
      if (p) p.catch(() => undefined); // autoplay may reject until a gesture — stays muted/paused
    } else {
      video.pause();
      if (!active) video.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hls]);

  // View + progress reporting, scoped to the active slide.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    let watchedMs = 0;
    let last = performance.now();
    let viewed = false;

    const tick = () => {
      const now = performance.now();
      if (!video.paused) watchedMs += now - last;
      last = now;
      if (!viewed && watchedMs >= VIEW_THRESHOLD_MS) {
        viewed = true;
        void postView(uuid, getToken());
        track("video_play", { video_uuid: uuid, shorts: true });
      }
    };
    const stickyTimer = setInterval(tick, 500);

    const sendProgress = () => {
      const token = getToken();
      const duration = video.duration || 0;
      if (!token || !duration) return;
      const current = video.currentTime || 0;
      void postProgress(uuid, Math.min(current / duration, 1), Math.floor(current), token);
    };
    const progressTimer = setInterval(sendProgress, PROGRESS_INTERVAL_MS);

    return () => {
      clearInterval(stickyTimer);
      clearInterval(progressTimer);
      sendProgress();
    };
  }, [active, uuid, getToken]);

  // Tap toggles play/pause (basic gesture; advanced gestures are a follow-up).
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const p = video.play();
      if (p) p.catch(() => undefined);
    } else {
      video.pause();
    }
  }

  return (
    <div className="absolute inset-0" onClick={togglePlay}>
      <video
        ref={videoRef}
        poster={poster ?? undefined}
        loop
        playsInline
        muted={muted}
        preload="auto"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="h-full w-full object-contain"
      />

      {/* Poster placeholder until the signed source resolves (slow network). */}
      {!hls && poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : null}

      {/* Paused indicator on the active slide. */}
      {active && paused ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
            <Play size={32} fill="currentColor" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
