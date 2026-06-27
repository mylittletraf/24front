"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "@/lib/hooks/use-in-view";
import { useHasHover } from "@/lib/hooks/use-media-query";
import { trailerController } from "./trailer-controller";

/**
 * Trailer playback behavior for video cards.
 * - Desktop (hover): start after a 300ms hover delay, stop on leave.
 * - Mobile (no hover): tap the play control to start — deterministic, instead of the old
 *   autoplay-when-in-view (which flickered on/off while scrolling). A tapped trailer auto-stops
 *   once the card scrolls out of view, so it never keeps playing off-screen.
 * Only one tapped trailer plays at a time — starting one pauses the previously playing one
 * (via {@link trailerController}). The trailer file is never requested until `playing` is true.
 */
export function useTrailer(hasTrailer: boolean) {
  const hasHover = useHasHover();
  const idRef = useRef<symbol>(Symbol("trailer"));
  const [hoverPlaying, setHoverPlaying] = useState(false);
  const [tapPlaying, setTapPlaying] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mobile only: track visibility so a tapped trailer stops while the card is off-screen (and
  // resumes if it scrolls back). Deriving `playing` from `inView` avoids a setState-in-effect.
  const { ref, inView } = useInView<HTMLDivElement>({
    threshold: 0,
    enabled: hasTrailer && !hasHover,
  });

  // Pause this card when another trailer takes over; clean up the slot on unmount.
  useEffect(() => {
    const id = idRef.current;
    const unsubscribe = trailerController.subscribe(id, () => setTapPlaying(false));
    return () => {
      unsubscribe();
      trailerController.stop(id);
      clearTimeout(hoverTimer.current);
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

  const toggle = useCallback(() => {
    const id = idRef.current;
    if (trailerController.isActive(id)) {
      trailerController.stop(id);
      setTapPlaying(false);
    } else {
      trailerController.play(id); // stops any other playing trailer
      setTapPlaying(true);
    }
  }, []);

  const playing = hasHover ? hoverPlaying : tapPlaying && inView;
  // The manual play/pause control is only for touch devices (desktop uses hover).
  const showControl = hasTrailer && !hasHover;

  return { ref, playing, hasHover, showControl, tapPlaying, toggle, onMouseEnter, onMouseLeave };
}
