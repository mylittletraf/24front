/** API base used from Server Components / route handlers (server-to-server). */
export const SERVER_API_BASE =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

/** API base used from the browser. */
export const CLIENT_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

/** Public origin of this frontend. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Site brand name, shown in the header, footer and page titles. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "24front";

/** Default site description used as the metadata fallback. */
export const SITE_DESCRIPTION = process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "Tube site";

/**
 * Whether the catalog contains adult / 18+ content. Drives `isFamilyFriendly:false`,
 * `og:restrictions:age`, `ya:ovs:adult` and `<meta name="rating">`. Defaults to `true`
 * (set `NEXT_PUBLIC_ADULT_CONTENT=false` to drop the age-restriction markup).
 */
export const ADULT_CONTENT = (process.env.NEXT_PUBLIC_ADULT_CONTENT ?? "true") !== "false";
