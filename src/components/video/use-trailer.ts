"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInView } from "@/lib/hooks/use-in-view";
import { useHasHover } from "@/lib/hooks/use-media-query";
import { trailerController } from "./trailer-controller";

/**
 * Trailer playback behavior for video cards.
 * - Desktop (hover): start after 300ms hover delay, stop on leave.
 * - Mobile (no hover): autoplay when in view, capped at 2 concurrent via trailerController.
 * The trailer file is never requested until `playing` is true.
 */
export function useTrailer(hasTrailer: boolean) {
  const hasHover = useHasHover();
  const idRef = useRef<symbol>(Symbol("trailer"));
  const [hoverPlaying, setHoverPlaying] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0.6,
    enabled: hasTrailer && !hasHover,
  });

  // Mobile: hold a slot only while in view; the controller decides who actually plays.
  useEffect(() => {
    if (hasHover || !hasTrailer || !inView) return;
    const id = idRef.current;
    trailerController.request(id);
    return () => trailerController.release(id);
  }, [inView, hasHover, hasTrailer]);

  const subscribe = useCallback(
    (onChange: () => void) => trailerController.subscribe(idRef.current, onChange),
    [],
  );
  const getSnapshot = useCallback(() => trailerController.isPlaying(idRef.current), []);
  const granted = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    const id = idRef.current;
    return () => {
      clearTimeout(hoverTimer.current);
      trailerController.release(id);
    };
  }, []);

  const onMouseEnter = () => {
    if (!hasHover || !hasTrailer) return;
    hoverTimer.current = setTimeout(() => setHoverPlaying(true), 300);
  };

  const onMouseLeave = () => {
    if (!hasHover) return;
    clearTimeout(hoverTimer.current);
    setHoverPlaying(false);
  };

  const playing = hasHover ? hoverPlaying : granted && inView;

  return { ref, playing, hasHover, onMouseEnter, onMouseLeave };
}
