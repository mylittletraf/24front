import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";

/**
 * Language selection via `?lang=<locale>`: persist it in the NEXT_LOCALE cookie and forward it
 * on the current request so the page renders in that language immediately (the request config
 * reads the cookie first). Without `?lang`, locale falls back to cookie → Accept-Language → default.
 */
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  const persistLang =
    !!lang && isLocale(lang) && request.cookies.get(LOCALE_COOKIE)?.value !== lang;

  // Persist the ?lang choice on this request so the page renders in it immediately.
  if (persistLang) request.cookies.set(LOCALE_COOKIE, lang);

  // Expose the pathname to Server Components (the root layout strips chrome on /embed).
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers } });
  if (persistLang) {
    response.cookies.set(LOCALE_COOKIE, lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Run on pages only — skip API/proxy, Next internals, masked media, and SEO infra files.
  matcher: ["/((?!api|_next/static|_next/image|media|favicon.ico|sitemap|robots).*)"],
};
