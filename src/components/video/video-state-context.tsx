"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getVideosState, type VideoState } from "@/lib/api/me-state";
import { addFavorite, removeFavorite } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

type Reaction = "like" | "dislike" | null;

interface VideoStateContextValue {
  /** Request {favorited, reaction} for these video UUIDs (batched). */
  register: (uuids: string[]) => void;
  isFavorite: (uuid: string) => boolean;
  getReaction: (uuid: string) => Reaction;
  /** Optimistic favorite toggle with a debounced backend sync. */
  toggleFavorite: (uuid: string) => void;
  /** Update the cached reaction (called by the reaction control after a change). */
  setReaction: (uuid: string, reaction: Reaction) => void;
}

const VideoStateContext = createContext<VideoStateContextValue | null>(null);

export function useVideoState(): VideoStateContextValue {
  const ctx = useContext(VideoStateContext);
  if (!ctx) throw new Error("useVideoState must be used within VideoStateProvider");
  return ctx;
}

const BATCH_DEBOUNCE_MS = 120;
const FAVORITE_DEBOUNCE_MS = 700;

export function VideoStateProvider({ children }: { children: ReactNode }) {
  const { status, getToken } = useAuth();
  const queryClient = useQueryClient();
  const [states, setStates] = useState<Record<string, VideoState>>({});

  const requested = useRef<Set<string>>(new Set());
  const pending = useRef<Set<string>>(new Set());
  const batchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // favorite desired (UI) vs synced (server) state, read inside debounce timers
  const favDesired = useRef<Record<string, boolean>>({});
  const favSynced = useRef<Record<string, boolean>>({});
  const favTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const flushBatch = useCallback(() => {
    const ids = [...pending.current];
    pending.current.clear();
    if (ids.length === 0) return;
    const token = getToken();
    if (!token) {
      setStates((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] ??= { favorited: false, reaction: null };
        return next;
      });
      return;
    }
    getVideosState(ids, token)
      .then((map) => {
        for (const [id, s] of Object.entries(map)) {
          favSynced.current[id] = s.favorited;
          if (favDesired.current[id] === undefined) favDesired.current[id] = s.favorited;
        }
        setStates((prev) => ({ ...prev, ...map }));
      })
      .catch(() => undefined);
  }, [getToken]);

  const scheduleBatch = useCallback(() => {
    clearTimeout(batchTimer.current);
    batchTimer.current = setTimeout(flushBatch, BATCH_DEBOUNCE_MS);
  }, [flushBatch]);

  const register = useCallback(
    (uuids: string[]) => {
      let added = false;
      for (const id of uuids) {
        if (!requested.current.has(id)) {
          requested.current.add(id);
          pending.current.add(id);
          added = true;
        }
      }
      if (added) scheduleBatch();
    },
    [scheduleBatch],
  );

  // Re-resolve known videos when auth changes (login refreshes, logout clears).
  useEffect(() => {
    const known = [...requested.current];
    if (known.length === 0) return;
    if (status === "authenticated") {
      known.forEach((id) => pending.current.add(id));
      scheduleBatch();
    } else if (status === "anonymous") {
      favDesired.current = {};
      favSynced.current = {};
      setStates(Object.fromEntries(known.map((id) => [id, { favorited: false, reaction: null }])));
    }
  }, [status, scheduleBatch]);

  const flushFavorite = useCallback(
    (uuid: string) => {
      const desired = favDesired.current[uuid] ?? false;
      if (desired === (favSynced.current[uuid] ?? false)) return;
      const token = getToken();
      if (!token) return;
      favSynced.current[uuid] = desired;
      const request = desired ? addFavorite(uuid, token) : removeFavorite(uuid, token);
      request
        .then(() => queryClient.invalidateQueries({ queryKey: ["me-feed", "/me/favorites/"] }))
        .catch((error) => {
          const reverted = !desired;
          favSynced.current[uuid] = reverted;
          favDesired.current[uuid] = reverted;
          setStates((prev) => ({
            ...prev,
            [uuid]: { favorited: reverted, reaction: prev[uuid]?.reaction ?? null },
          }));
          toastApiError(error);
        });
    },
    [getToken, queryClient],
  );

  const toggleFavorite = useCallback(
    (uuid: string) => {
      const next = !(favDesired.current[uuid] ?? false);
      favDesired.current[uuid] = next;
      setStates((prev) => ({
        ...prev,
        [uuid]: { favorited: next, reaction: prev[uuid]?.reaction ?? null },
      }));
      const timers = favTimers.current;
      clearTimeout(timers.get(uuid));
      timers.set(
        uuid,
        setTimeout(() => flushFavorite(uuid), FAVORITE_DEBOUNCE_MS),
      );
    },
    [flushFavorite],
  );

  const setReaction = useCallback((uuid: string, reaction: Reaction) => {
    setStates((prev) => ({
      ...prev,
      [uuid]: { favorited: prev[uuid]?.favorited ?? false, reaction },
    }));
  }, []);

  const value = useMemo<VideoStateContextValue>(
    () => ({
      register,
      isFavorite: (uuid) => states[uuid]?.favorited ?? false,
      getReaction: (uuid) => states[uuid]?.reaction ?? null,
      toggleFavorite,
      setReaction,
    }),
    [states, register, toggleFavorite, setReaction],
  );

  return <VideoStateContext.Provider value={value}>{children}</VideoStateContext.Provider>;
}
