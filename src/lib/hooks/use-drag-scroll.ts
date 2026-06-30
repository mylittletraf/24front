"use client";

import { useCallback, useRef } from "react";

/**
 * Click-and-drag horizontal scrolling for an `overflow-x-auto` container (gallery-style).
 * Mouse only — touch devices keep their native momentum scroll, so we bail on non-mouse pointers.
 * A drag that crosses the movement threshold swallows the trailing `click` (in the capture phase)
 * so dragging across a card never opens its link.
 *
 * Usage: spread `handlers` onto the scroll container and attach `ref` to it.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const state = useRef({ down: false, dragging: false, startX: 0, startScroll: 0, pointerId: -1 });

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    state.current = {
      down: true,
      dragging: false,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      pointerId: e.pointerId,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<T>) => {
    const el = ref.current;
    const s = state.current;
    if (!s.down || !el) return;
    const dx = e.clientX - s.startX;
    if (!s.dragging && Math.abs(dx) < 6) return;
    if (!s.dragging) {
      s.dragging = true;
      el.setPointerCapture(s.pointerId);
    }
    el.scrollLeft = s.startScroll - dx;
  }, []);

  const onPointerUp = useCallback(() => {
    const el = ref.current;
    const { pointerId } = state.current;
    if (el?.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    state.current.down = false;
  }, []);

  // Cancel the synthetic click that follows a drag so the card link doesn't fire.
  const onClickCapture = useCallback((e: React.MouseEvent<T>) => {
    if (state.current.dragging) {
      e.preventDefault();
      e.stopPropagation();
      state.current.dragging = false;
    }
  }, []);

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onClickCapture,
    },
  };
}
