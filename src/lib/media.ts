import { SITE_URL } from "@/lib/api/config";

// Storage path prefix that the public /media route maps back to (see next.config rewrites).
// All backend media is served under this prefix; it's stripped for cleaner public URLs.
const STRIP_PREFIX = process.env.NEXT_PUBLIC_MEDIA_STRIP_PREFIX ?? "/local-storage";

/**
 * Mask a backend storage URL behind the same-origin `/media` prefix so the storage host is
 * never exposed in the page (e.g. `http://storage:8000/local-storage/.../poster.webp`
 * → `/media/local-image/.../poster.webp`). Next rewrites `/media/*` back to the real
 * storage server-side. Relative URLs and unparseable values pass through unchanged.
 */
export function toMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== "string" || url.startsWith("/")) return url;
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return url;
  }
  if (STRIP_PREFIX && path.startsWith(`${STRIP_PREFIX}/`)) path = path.slice(STRIP_PREFIX.length);
  return `/media${path}` as T;
}

/**
 * Absolute variant for places that need a full URL (SEO/OG/JSON-LD): `${SITE_URL}/media/…`.
 * Only rewrites storage-signed URLs (path under the storage prefix) so canonical/page/schema.org
 * URLs are left untouched.
 */
export function toPublicMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    if (!u.pathname.startsWith(`${STRIP_PREFIX}/`)) return url;
    return `${SITE_URL}/media${u.pathname.slice(STRIP_PREFIX.length)}${u.search}` as T;
  } catch {
    return url;
  }
}

/** Recursively mask storage URLs in an arbitrary structure (e.g. JSON-LD). */
export function maskMediaDeep<T>(value: T): T {
  if (typeof value === "string") return toPublicMediaUrl(value) as T;
  if (Array.isArray(value)) return value.map((v) => maskMediaDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = maskMediaDeep(v);
    return out as T;
  }
  return value;
}
