import { SITE_URL } from "@/lib/api/config";

// The frontend's own host — its URLs (canonical/page links) are never storage, so never masked.
let SITE_HOST = "";
try {
  SITE_HOST = new URL(SITE_URL).host.toLowerCase();
} catch {
  /* SITE_URL malformed — treat nothing as the site host */
}

// Media file extensions, used to recognise storage URLs inside arbitrary SEO/JSON-LD payloads.
const MEDIA_EXT = /\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|mov|m4v|m3u8|ts|mpd|vtt)$/i;

/**
 * Same-origin `/media` path that carries the original scheme + host, so the proxy
 * (src/app/media/[...path]/route.ts) can forward to whatever storage server the API returned —
 * any number of external hosts, rotating freely, with no per-host config:
 *   `https://cdn-7.example.com/v/514/playlist.m3u8`
 *     → `/media/https/cdn-7.example.com/v/514/playlist.m3u8`
 * Relative HLS segments resolve under that same prefix automatically. The site's own host and
 * relative/unparseable values pass through unchanged.
 */
function maskAbsolute(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (u.host.toLowerCase() === SITE_HOST) return url;
  return `/media/${u.protocol.replace(":", "")}/${u.host}${u.pathname}${u.search}`;
}

/** Mask a dedicated media field (poster/hls/trailer/…), which is always a storage URL. */
export function toMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return url;
  return maskAbsolute(url) as T;
}

/**
 * Absolute variant for places that need a full URL (SEO/OG/JSON-LD): `${SITE_URL}/media/…`.
 * Pass through anything that isn't an off-site storage URL.
 */
export function toPublicMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return url;
  const masked = maskAbsolute(url);
  return (masked.startsWith("/media/") ? `${SITE_URL}${masked}` : url) as T;
}

/**
 * Recursively mask storage URLs in an arbitrary structure (e.g. the backend SEO payload / JSON-LD).
 * Only touches off-site URLs that look like media files, so canonical/hreflang/og:url and
 * schema.org context URLs are left untouched.
 */
export function maskMediaDeep<T>(value: T): T {
  if (typeof value === "string") {
    if (!/^https?:\/\//i.test(value)) return value;
    let pathname: string;
    try {
      pathname = new URL(value).pathname;
    } catch {
      return value;
    }
    return (MEDIA_EXT.test(pathname) ? toPublicMediaUrl(value) : value) as T;
  }
  if (Array.isArray(value)) return value.map((v) => maskMediaDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = maskMediaDeep(v);
    return out as T;
  }
  return value;
}
