import { NextResponse, type NextRequest } from "next/server";
import { AGE_VERIFIED_COOKIE } from "@/lib/legal";

/** Only same-site absolute paths (blocks open-redirect + protocol-relative `//host`). */
function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

/**
 * Sets the 18+ cookie and sends the visitor back where they were headed. Driven by a plain HTML
 * `<form method="post">` so confirmation works with zero client-side JS — the age gate must never
 * depend on hydration (which is why the previous onClick buttons did nothing in some browsers).
 */
export async function POST(request: NextRequest) {
  // Build the redirect off the real Host header, not request.url — under `next dev --hostname
  // 0.0.0.0` request.url carries the bind address (0.0.0.0), which would bounce the phone there.
  const host = request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : request.url;

  const form = await request.formData();
  const res = NextResponse.redirect(new URL(safeNext(form.get("next")), base), 303);
  res.cookies.set(AGE_VERIFIED_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // ~1 year
    sameSite: "lax",
  });
  return res;
}
