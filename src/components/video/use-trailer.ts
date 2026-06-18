"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/hooks/use-in-view";
import { useHasHover } from "@/lib/hooks/use-media-query";

// Global cap on simultaneously playing trailers (UI_SPEC §3.2: max 2 on mobile).
const MAX_CONCURRENT = 2;
const activeTrailers = new Set<symbol>();

function acquireSlot(id: symbol): boolean {
  if (activeTrailers.has(id)) return true;
  if (activeTrailers.size >= MAX_CONCURRENT) return false;
  activeTrailers.add(id);
  return true;
}

function releaseSlot(id: symbol): void {
  activeTrailers.delete(id);
}

/**
 * Trailer playback behavior for video cards.
 * - Desktop (hover): start after 300ms hover delay, stop on leave.
 * - Mobile (no hover): autoplay when ≥70% in view, respecting the global 2-trailer cap.
 * The trailer file is never requested until `playing` is true.
 */
export function useTrailer(hasTrailer: boolean) {
  const hasHover = useHasHover();
  const [playing, setPlaying] = useState(false);
  const idRef = useRef<symbol>(Symbol("trailer"));
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.7,
    enabled: hasTrailer && !hasHover,
  });

  // Mobile auto-play in viewport.
  useEffect(() => {
    if (hasHover || !hasTrailer) return;
    const id = idRef.current;
    if (inView && acquireSlot(id)) {
      setPlaying(true);
    } else {
      releaseSlot(id);
      setPlaying(false);
    }
    return () => releaseSlot(id);
  }, [inView, hasHover, hasTrailer]);

  useEffect(() => {
    const id = idRef.current;
    return () => {
      clearTimeout(hoverTimer.current);
      releaseSlot(id);
    };
  }, []);

  const onMouseEnter = () => {
    if (!hasHover || !hasTrailer) return;
    hoverTimer.current = setTimeout(() => setPlaying(true), 300);
  };

  const onMouseLeave = () => {
    if (!hasHover) return;
    clearTimeout(hoverTimer.current);
    setPlaying(false);
  };

  return { ref, playing, hasHover, onMouseEnter, onMouseLeave };
}
