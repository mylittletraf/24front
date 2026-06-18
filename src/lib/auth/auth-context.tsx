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
import { getMe, type User } from "@/lib/api/me";
import { bffLogout, bffRefresh, bffSession } from "./bff-client";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  getToken: () => string | null;
  /** Refresh the access token via the BFF; returns the new token or null. */
  refresh: () => Promise<string | null>;
  /** Called by login/register flows once a session is established. */
  setSession: (access: string, user?: User | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const tokenRef = useRef<string | null>(null);

  const applyToken = useCallback(async (access: string | null) => {
    tokenRef.current = access;
    if (!access) {
      setUser(null);
      setStatus("anonymous");
      return;
    }
    try {
      const me = await getMe(access);
      setUser(me);
      setStatus("authenticated");
    } catch {
      tokenRef.current = null;
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  // Rehydrate session from the httpOnly refresh cookie on mount.
  useEffect(() => {
    let cancelled = false;
    bffSession()
      .then(({ access }) => {
        if (!cancelled) return applyToken(access);
      })
      .catch(() => {
        if (!cancelled) setStatus("anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  const refresh = useCallback(async () => {
    try {
      const { access } = await bffRefresh();
      tokenRef.current = access;
      return access;
    } catch {
      tokenRef.current = null;
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  const setSession = useCallback(
    async (access: string, nextUser?: User | null) => {
      if (nextUser) {
        tokenRef.current = access;
        setUser(nextUser);
        setStatus("authenticated");
      } else {
        await applyToken(access);
      }
    },
    [applyToken],
  );

  const logout = useCallback(async () => {
    await bffLogout().catch(() => undefined);
    tokenRef.current = null;
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      getToken: () => tokenRef.current,
      refresh,
      setSession,
      logout,
    }),
    [user, status, refresh, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
