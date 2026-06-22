/**
 * Legal / consent constants shared by Server Components (the root layout reads the cookie) and
 * Client Components (the age gate writes it). Kept in a plain module — not a `"use client"` file —
 * so the server import resolves to the real string value, not a client-reference placeholder.
 */
export const AGE_VERIFIED_COOKIE = "age_verified";
