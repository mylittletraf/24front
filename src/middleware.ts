import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";

/**
 * Language selection via `?lang=<locale>`: persist it in the NEXT_LOCALE cookie and forward it
 * on the current request so the page renders in that language immediately (the request config
 * reads the cookie first). Without `?lang`, locale falls back to cookie → Accept-Language → default.
 */
export function middleware(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang && isLocale(lang) && request.cookies.get(LOCALE_COOKIE)?.value !== lang) {
    request.cookies.set(LOCALE_COOKIE, lang);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(LOCALE_COOKIE, lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  // Run on pages only — skip API/proxy, Next internals, masked media, and SEO infra files.
  matcher: ["/((?!api|_next/static|_next/image|media|favicon.ico|sitemap|robots).*)"],
};
