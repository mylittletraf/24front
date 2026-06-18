import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { SERVER_API_BASE } from "@/lib/api/config";
import { REFRESH_COOKIE, refreshCookieOptions } from "@/lib/auth/cookies";

/**
 * BFF for authentication. The browser never touches the backend auth endpoints
 * directly: `refresh` lives in an httpOnly cookie set here, `access` is returned
 * in the JSON body for the client to keep in memory.
 */

interface BackendResult {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
}

async function backend(path: string, body: unknown): Promise<BackendResult> {
  const res = await fetch(`${SERVER_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  return { ok: res.ok, status: res.status, data };
}

function sessionResponse(
  payload: Record<string, unknown>,
  refresh: string,
  status = 200,
): NextResponse {
  const res = NextResponse.json(payload, { status });
  res.cookies.set(REFRESH_COOKIE, refresh, refreshCookieOptions());
  return res;
}

/** Splits {access, refresh, ...rest}: rest+access go to the client, refresh to the cookie. */
function commitSession(data: Record<string, unknown> | null, status = 200): NextResponse {
  const refresh = typeof data?.refresh === "string" ? data.refresh : null;
  if (!data || !refresh) {
    return NextResponse.json({ detail: "Invalid auth response" }, { status: 502 });
  }
  const { refresh: _omit, ...rest } = data;
  void _omit;
  return sessionResponse(rest, refresh, status);
}

/**
 * Renew the session from the refresh cookie. `soft` (used by the on-load bootstrap) returns
 * 200 `{ access: null }` for the anonymous/expired case so the browser doesn't log a 401;
 * the explicit mid-session refresh keeps returning 401.
 */
async function refreshSession(soft = false): Promise<NextResponse> {
  const noSession = (detail: string) =>
    soft ? NextResponse.json({ access: null }) : NextResponse.json({ detail }, { status: 401 });

  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return noSession("No session");

  const { ok, data } = await backend("/auth/refresh/", { refresh });
  if (!ok || typeof data?.access !== "string" || typeof data?.refresh !== "string") {
    const res = noSession("Session expired");
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }
  return sessionResponse({ access: data.access }, data.refresh);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;

  switch (action) {
    case "login": {
      const result = await backend("/auth/login/", await req.json());
      if (!result.ok) return NextResponse.json(result.data, { status: result.status });
      return commitSession(result.data);
    }
    case "register": {
      const result = await backend("/auth/register/", await req.json());
      if (!result.ok) return NextResponse.json(result.data, { status: result.status });
      return commitSession(result.data, 201);
    }
    case "quick-login": {
      const result = await backend("/auth/quick-login/", await req.json());
      if (!result.ok) return NextResponse.json(result.data, { status: result.status });
      return commitSession(result.data);
    }
    case "refresh":
      return refreshSession();
    case "logout": {
      const jar = await cookies();
      const refresh = jar.get(REFRESH_COOKIE)?.value;
      if (refresh) await backend("/auth/logout/", { refresh }).catch(() => undefined);
      const res = NextResponse.json({ ok: true });
      res.cookies.delete(REFRESH_COOKIE);
      return res;
    }
    default:
      return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (action !== "session") return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return refreshSession(true);
}
