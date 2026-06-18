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

export const bffSession = () => bff<BootstrapResult>("session", undefined, "GET");
export const bffRefresh = () => bff<SessionResult>("refresh");
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
