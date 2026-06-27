import net from "node:net";
import type { NextRequest } from "next/server";
import { toMediaUrl } from "@/lib/media";

// Stream media (images, HLS playlists/segments) from whatever storage host the API masked into the
// path (`/media/<scheme>/<host>/<path>` — see src/lib/media.ts). This lets any number of external
// storage hosts rotate freely with no per-host config, while staying same-origin for the browser.
export const dynamic = "force-dynamic";

// Hosts explicitly trusted even though they are private/loopback (e.g. the local dev storage).
const INTERNAL_HOSTS = (process.env.MEDIA_INTERNAL_HOSTS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isPrivate(host: string): boolean {
  const name = host.split(":")[0].toLowerCase();
  if (name === "localhost" || name.endsWith(".local") || name.endsWith(".internal")) return true;
  if (net.isIP(name)) {
    return (
      /^127\./.test(name) ||
      /^10\./.test(name) ||
      /^192\.168\./.test(name) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(name) ||
      /^169\.254\./.test(name) ||
      name === "::1" ||
      name.startsWith("fc") ||
      name.startsWith("fd") ||
      name.startsWith("fe80")
    );
  }
  return false;
}

// SSRF guard: allow any public host (so external storages need no config), block private/internal
// targets unless explicitly whitelisted via MEDIA_INTERNAL_HOSTS.
function hostAllowed(host: string): boolean {
  const full = host.toLowerCase();
  const name = full.split(":")[0];
  if (
    INTERNAL_HOSTS.some((e) =>
      e.includes(":") ? full === e : name === e || name.endsWith(`.${e}`),
    )
  ) {
    return true;
  }
  return !isPrivate(full);
}

const PASS_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
  "expires",
];

const EXT_CONTENT_TYPE: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  ts: "video/mp2t",
  mp4: "video/mp4",
  webm: "video/webm",
  vtt: "text/vtt",
};

async function proxy(req: NextRequest, segments: string[], method: "GET" | "HEAD") {
  const [scheme, host, ...rest] = segments;
  if (
    (scheme !== "http" && scheme !== "https") ||
    !host ||
    !hostAllowed(host) ||
    rest.length === 0
  ) {
    return new Response("Forbidden media target", { status: 403 });
  }

  const upstream = `${scheme}://${host}/${rest.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;

  // Forward range + conditional headers so video seeking and caching keep working.
  const fwd = new Headers();
  for (const h of ["range", "if-none-match", "if-modified-since"]) {
    const v = req.headers.get(h);
    if (v) fwd.set(h, v);
  }

  let res: Response;
  try {
    res = await fetch(upstream, { method, headers: fwd, redirect: "follow", cache: "no-store" });
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }

  const out = new Headers();
  for (const h of PASS_RESPONSE_HEADERS) {
    const v = res.headers.get(h);
    if (v) out.set(h, v);
  }
  if (!out.has("content-type")) {
    const ext = rest[rest.length - 1]?.split(".").pop()?.toLowerCase();
    if (ext && EXT_CONTENT_TYPE[ext]) out.set("content-type", EXT_CONTENT_TYPE[ext]);
  }
  if (!out.has("cache-control")) out.set("cache-control", "public, max-age=3600");

  // DEV-ONLY: rewrite absolute URLs inside HLS playlists so nested variant/segment URLs also go
  // through this proxy (the backend emits absolute loopback URLs a LAN phone can't reach). In prod
  // HLS never passes through /media (it's served direct), so this branch is dead — and gated off
  // anyway, leaving the production response byte-for-byte identical.
  const isPlaylist =
    (out.get("content-type") ?? "").includes("mpegurl") ||
    rest[rest.length - 1]?.toLowerCase().endsWith(".m3u8");
  if (process.env.NODE_ENV !== "production" && method === "GET" && isPlaylist) {
    const body = (await res.text()).replace(/https?:\/\/[^\s"']+/g, (m) => toMediaUrl(m));
    out.delete("content-length"); // length changed by rewriting
    return new Response(body, { status: res.status, headers: out });
  }

  return new Response(method === "HEAD" ? null : res.body, { status: res.status, headers: out });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path, "GET");
}

export async function HEAD(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await ctx.params).path, "HEAD");
}
