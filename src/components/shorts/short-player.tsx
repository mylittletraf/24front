"use client";

import { Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { getPlayback, postProgress, postView } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { attachHls } from "@/lib/hls/attach-hls";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/format";

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
  active,
  muted,
  loop = false,
  onError,
  onEnded,
}: {
  uuid: string;
  active: boolean;
  muted: boolean;
  /** Loop the clip instead of advancing (off by default → auto-advance via onEnded). */
  loop?: boolean;
  /** Fatal HLS error → feed auto-skips to the next slide. */
  onError?: () => void;
  /** Fired when the clip ends and `loop` is false (feed advances to the next short). */
  onEnded?: () => void;
}) {
  const { getToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

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

  // Scrub: map a pointer x to a time and seek live (YouTube/TikTok-style draggable bar).
  function scrubTo(clientX: number) {
    const video = videoRef.current;
    const bar = barRef.current;
    if (!video || !video.duration || !bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setProgress(ratio);
  }
  function onScrubDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    barRef.current?.setPointerCapture(e.pointerId);
    setScrubbing(true);
    scrubTo(e.clientX);
  }
  function onScrubMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    e.stopPropagation();
    scrubTo(e.clientX);
  }
  function onScrubUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    e.stopPropagation();
    setScrubbing(false);
  }

  return (
    <div className="absolute inset-0" onClick={togglePlay}>
      <video
        ref={videoRef}
        loop={loop}
        playsInline
        muted={muted}
        preload="auto"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={() => {
          if (!loop) onEnded?.();
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          if (scrubbing) return; // don't fight the drag
          const v = e.currentTarget;
          setProgress(v.duration ? v.currentTime / v.duration : 0);
        }}
        className="h-full w-full object-contain"
      />

      {/* Paused indicator on the active slide. */}
      {active && paused ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/40 text-white backdrop-blur">
            <Play size={32} fill="currentColor" />
          </span>
        </div>
      ) : null}

      {/* Draggable scrubber — grows + shows a knob and a time tooltip while seeking (YT/TikTok). */}
      <div
        ref={barRef}
        onPointerDown={onScrubDown}
        onPointerMove={onScrubMove}
        onPointerUp={onScrubUp}
        onPointerCancel={onScrubUp}
        onClick={(e) => e.stopPropagation()}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={-1}
        className="group/scrub absolute right-0 bottom-0 left-0 z-20 flex h-5 touch-none items-end"
      >
        {scrubbing && duration > 0 ? (
          <div
            className="absolute -top-7 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white tabular-nums"
            style={{ left: `${progress * 100}%` }}
          >
            {formatDuration(progress * duration)} / {formatDuration(duration)}
          </div>
        ) : null}
        <div
          className={cn(
            "w-full bg-white/25 transition-all duration-150",
            scrubbing ? "h-1.5" : "h-1 group-hover/scrub:h-1.5",
          )}
        >
          <div className="bg-accent relative h-full" style={{ width: `${progress * 100}%` }}>
            <span
              className={cn(
                "bg-accent absolute top-1/2 right-0 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full shadow transition-transform duration-150",
                scrubbing ? "scale-100" : "scale-0 group-hover/scrub:scale-100",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
