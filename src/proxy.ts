import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";
import { AGE_VERIFIED_COOKIE } from "@/lib/legal";

const ADULT_CONTENT = (process.env.NEXT_PUBLIC_ADULT_CONTENT ?? "true") !== "false";

// Reachable without confirming age: the gate itself, legally-required pages, and the chrome-less
// embed player (used inside third-party iframes, where an interstitial would break the embed).
const AGE_EXEMPT = [/^\/age(\/|$)/, /^\/privacy(\/|$)/, /^\/embed(\/|$)/];

// Let search engines and link-preview crawlers reach the real content so the catalog stays fully
// indexable. Humans get the /age interstitial; bots get the page. This is the standard, Google-
// accepted age-gate handling (not cloaking — both are served the same content once past the gate).
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|yandex|baidu|duckduck|applebot|facebookexternalhit|telegram|twitter|whatsapp|skypeuripreview|embedly|pinterest|redditbot|discord/i;

/** Humans without the 18+ cookie are bounced to /age (only when the build serves adult content). */
function needsAgeGate(request: NextRequest): boolean {
  if (!ADULT_CONTENT) return false;
  if (request.cookies.get(AGE_VERIFIED_COOKIE)?.value === "1") return false;
  if (AGE_EXEMPT.some((re) => re.test(request.nextUrl.pathname))) return false;
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) return false;
  return true;
}

/**
 * Language selection via `?lang=<locale>`: persist it in the NEXT_LOCALE cookie and forward it
 * on the current request so the page renders in that language immediately (the request config
 * reads the cookie first). Without `?lang`, locale falls back to cookie → Accept-Language → default.
 */
export function proxy(request: NextRequest) {
  // Age gate first: redirect unverified humans to /age, remembering where they were headed.
  if (needsAgeGate(request)) {
    // Build off request.url so the redirect keeps the real host (works over LAN/mobile too).
    const url = new URL("/age", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url, 307);
  }

  const lang = request.nextUrl.searchParams.get("lang");
  const persistLang =
    !!lang && isLocale(lang) && request.cookies.get(LOCALE_COOKIE)?.value !== lang;

  // Persist the ?lang choice on this request so the page renders in it immediately.
  if (persistLang) request.cookies.set(LOCALE_COOKIE, lang);

  // Expose the pathname to Server Components (the root layout strips chrome on /embed and /age).
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
