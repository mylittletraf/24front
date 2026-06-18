"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Reaction = "like" | "dislike" | null;

/**
 * Optimistic like/dislike state with a debounced backend sync. Rapid clicks update
 * the UI instantly but collapse into a single request for the final state; if the
 * final state equals what the server already has, no request is sent.
 */
export function useReaction({
  likesCount,
  dislikesCount,
  initial = null,
  sync,
  onError,
  delay = 700,
}: {
  likesCount: number;
  dislikesCount: number;
  initial?: Reaction;
  /** Send the request that brings the server to `next` (POST like|dislike, or DELETE for null). */
  sync: (next: Reaction) => Promise<void>;
  onError?: (error: unknown) => void;
  delay?: number;
}) {
  const [reaction, setReaction] = useState<Reaction>(initial);
  const reactionRef = useRef<Reaction>(initial);
  const syncedRef = useRef<Reaction>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  const syncRef = useRef(sync);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    syncRef.current = sync;
    onErrorRef.current = onError;
  });

  const flush = useCallback(() => {
    const target = reactionRef.current;
    if (target === syncedRef.current) return;
    const previous = syncedRef.current;
    syncedRef.current = target;
    syncRef.current(target).catch((error) => {
      syncedRef.current = previous;
      reactionRef.current = previous;
      if (mountedRef.current) setReaction(previous);
      onErrorRef.current?.(error);
    });
  }, []);

  const set = useCallback(
    (target: Exclude<Reaction, null>) => {
      const next = reactionRef.current === target ? null : target;
      reactionRef.current = next;
      setReaction(next);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  // Flush any pending change when leaving (e.g. navigating away).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      flush();
    };
  }, [flush]);

  const likes = likesCount + (reaction === "like" ? 1 : 0) - (initial === "like" ? 1 : 0);
  const dislikes =
    dislikesCount + (reaction === "dislike" ? 1 : 0) - (initial === "dislike" ? 1 : 0);

  return {
    reaction,
    likes,
    dislikes,
    like: () => set("like"),
    dislike: () => set("dislike"),
  };
}
