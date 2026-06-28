/**
 * "Show Shorts" preference, shared by the server (root layout reads the cookie to seed the provider
 * with no flash) and the client (the toggle writes it). Plain module — not `"use client"` — so the
 * server import resolves to the real string value.
 */
export const SHOW_SHORTS_COOKIE = "show_shorts";

/** Shorts are shown by default; only an explicit "0" hides them. */
export function shortsShownFromCookie(value: string | undefined): boolean {
  return value !== "0";
}
