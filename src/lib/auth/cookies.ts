export const REFRESH_COOKIE = "refresh_token";
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (refresh lifetime)

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}
