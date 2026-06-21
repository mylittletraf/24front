import type { User } from "@/lib/api/me";
import { ApiError, extractApiMessage } from "@/lib/api/errors";

async function bff<T>(action: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const res = await fetch(`/api/bff/auth/${action}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, extractApiMessage(data) ?? res.statusText, data);
  return data as T;
}

/**
 * Coalesce concurrent calls into a single in-flight request. The refresh cookie rotates on every
 * `/auth/refresh/`, so two simultaneous session/refresh calls (React StrictMode double-mount,
 * rapid remounts, racing components) would otherwise hit the backend twice — the second with an
 * already-rotated token — tripping the auth throttle and logging the user out.
 */
function coalesce<T>(fn: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    inFlight ??= fn().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export interface SessionResult {
  access: string;
}
export interface RegisterResult {
  access: string;
  user: User;
  quick_login_token: string;
}
/** Session bootstrap: access is null when not logged in (soft 200 rather than a 401). */
export interface BootstrapResult {
  access: string | null;
}

// Deduped: both hit the rotating /auth/refresh/ on the backend, so concurrent calls must share one.
export const bffSession = coalesce(() => bff<BootstrapResult>("session", undefined, "GET"));
export const bffRefresh = coalesce(() => bff<SessionResult>("refresh"));
export const bffLogin = (username: string, password: string) =>
  bff<SessionResult>("login", { username, password });
export const bffRegister = (payload: {
  username: string;
  password: string;
  email?: string;
  display_name?: string;
}) => bff<RegisterResult>("register", payload);
export const bffQuickLogin = (token: string) => bff<SessionResult>("quick-login", { token });
export const bffLogout = () => bff<{ ok: true }>("logout");
