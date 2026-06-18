"use client";

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
import { useQueryClient } from "@tanstack/react-query";
import { getFavoriteVideoIds } from "@/lib/api/me-feeds";
import { addFavorite, removeFavorite } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

const DEBOUNCE_MS = 700;

interface FavoritesContextValue {
  isFavorite: (uuid: string) => boolean;
  /** Optimistically flip favorite state; the backend call is debounced + coalesced. */
  toggleFavorite: (uuid: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

/**
 * Loads the authenticated user's favorited video IDs once, so bookmark icons reflect
 * state. Toggling is optimistic with a per-video debounced backend sync — rapid clicks
 * collapse into a single request (or none when back to the server's state).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { status, getToken } = useAuth();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  // desired (UI) state and last-synced (server) state, read inside debounce timers
  const desiredRef = useRef<Set<string>>(new Set());
  const syncedRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const commit = useCallback((next: Set<string>) => {
    desiredRef.current = next;
    setFavorites(next);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    getFavoriteVideoIds(token)
      .then((ids) => {
        if (cancelled) return;
        syncedRef.current = new Set(ids);
        commit(new Set(ids));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, getToken, commit]);

  const flush = useCallback(
    (uuid: string) => {
      const desired = desiredRef.current.has(uuid);
      if (desired === syncedRef.current.has(uuid)) return; // already in sync → no request
      const token = getToken();
      if (!token) return;

      if (desired) syncedRef.current.add(uuid);
      else syncedRef.current.delete(uuid);

      const request = desired ? addFavorite(uuid, token) : removeFavorite(uuid, token);
      request
        .then(() => {
          // refresh the profile "Favorites" feed so it reflects the change
          void queryClient.invalidateQueries({ queryKey: ["me-feed", "/me/favorites/"] });
        })
        .catch((error) => {
          // revert synced + desired UI state
          if (desired) syncedRef.current.delete(uuid);
          else syncedRef.current.add(uuid);
          const reverted = new Set(desiredRef.current);
          if (desired) reverted.delete(uuid);
          else reverted.add(uuid);
          commit(reverted);
          toastApiError(error);
        });
    },
    [getToken, commit, queryClient],
  );

  const toggleFavorite = useCallback(
    (uuid: string) => {
      const next = new Set(desiredRef.current);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      commit(next);

      const timers = timersRef.current;
      clearTimeout(timers.get(uuid));
      timers.set(
        uuid,
        setTimeout(() => flush(uuid), DEBOUNCE_MS),
      );
    },
    [commit, flush],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ isFavorite: (uuid) => favorites.has(uuid), toggleFavorite }),
    [favorites, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
