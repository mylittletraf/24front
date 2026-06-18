"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getFeedUnreadCount } from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";

interface FeedUnreadValue {
  count: number;
  /** Optimistically reset the badge (e.g. when the user opens /feed). */
  clear: () => void;
}

const FeedUnreadContext = createContext<FeedUnreadValue>({ count: 0, clear: () => {} });

export function useFeedUnread(): FeedUnreadValue {
  return useContext(FeedUnreadContext);
}

/** Polls the unseen-feed count for the nav badge; 0 (hidden) for anonymous users. */
export function FeedUnreadProvider({ children }: { children: ReactNode }) {
  const { status, getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["feed-unread"],
    queryFn: () => {
      const token = getToken();
      return token ? getFeedUnreadCount(token) : 0;
    },
    enabled: status === "authenticated",
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const value = useMemo<FeedUnreadValue>(
    () => ({
      count: status === "authenticated" ? (data ?? 0) : 0,
      clear: () => queryClient.setQueryData(["feed-unread"], 0),
    }),
    [status, data, queryClient],
  );

  return <FeedUnreadContext.Provider value={value}>{children}</FeedUnreadContext.Provider>;
}
