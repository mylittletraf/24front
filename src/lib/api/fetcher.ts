import { CLIENT_API_BASE, SERVER_API_BASE } from "./config";
import { ApiError, extractApiMessage } from "./errors";

export type QueryValue = string | number | boolean | undefined | null;

export interface ApiRequestOptions {
  params?: Record<string, QueryValue>;
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  /** Next.js ISR revalidate window (seconds) or false to opt out. */
  revalidate?: number | false;
  tags?: string[];
  signal?: AbortSignal;
  /** Override the API base (defaults to server/client base by environment). */
  base?: string;
}

function buildUrl(
  path: string,
  params: Record<string, QueryValue> | undefined,
  base: string,
): string {
  const url = new URL(path.replace(/^\//, ""), base.endsWith("/") ? base : `${base}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Isomorphic API fetch. Returns parsed JSON, throws {@link ApiError} on non-2xx.
 * 204/205 resolve to `undefined`.
 */
export async function apiFetch<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  let base = opts.base;
  if (!base) {
    if (typeof window === "undefined") {
      base = SERVER_API_BASE;
    } else if (opts.token) {
      // Authenticated calls go through the same-origin BFF proxy to avoid CORS.
      base = `${window.location.origin}/api/proxy`;
    } else {
      base = CLIENT_API_BASE;
    }
  }
  const url = buildUrl(path, opts.params, base);

  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const next: { revalidate?: number | false; tags?: string[] } = {};
  if (opts.revalidate !== undefined) next.revalidate = opts.revalidate;
  if (opts.tags) next.tags = opts.tags;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: opts.cache,
      next: Object.keys(next).length ? next : undefined,
      signal: opts.signal,
    });
  } catch (cause) {
    throw new ApiError(0, "network_error", { cause: String(cause) });
  }

  if (res.status === 204 || res.status === 205) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) || undefined : undefined;
    throw new ApiError(res.status, extractApiMessage(data) ?? res.statusText, data, retryAfter);
  }

  return data as T;
}

/** Like {@link apiFetch} but returns the raw status — used where 204 vs 200 carries meaning (VAST, view). */
export async function apiFetchStatus(
  path: string,
  opts: ApiRequestOptions = {},
): Promise<{ status: number; data: unknown }> {
  try {
    const data = await apiFetch<unknown>(path, opts);
    return { status: data === undefined ? 204 : 200, data };
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, data: error.data };
    throw error;
  }
}
