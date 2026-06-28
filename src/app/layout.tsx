import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdLayer } from "@/components/ads/ad-layer";
import { Analytics } from "@/components/analytics";
import { Footer } from "@/components/layout/footer";
import { HideOnShorts } from "@/components/layout/hide-on-shorts";
import { SiteHeader } from "@/components/layout/site-header";
import { CookieConsent } from "@/components/legal/cookie-consent";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/api/config";
import { SHOW_SHORTS_COOKIE, shortsShownFromCookie } from "@/lib/shorts-pref";
import { Providers } from "./providers";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Display face for the logo + short page headings. Cyrillic-capable (the site is RU-first),
// used with restraint so it stays a signature rather than the whole voice.
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME },
  // Site-ownership verification meta tags (Google Search Console / Yandex Webmaster).
  // Paste the token from each service into the env var; empty → tag omitted.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const pathname = (await headers()).get("x-pathname") ?? "";
  // Render chrome-less (no header/footer, no ad overlays, no consent): the Yandex Video embed
  // (/embed/[slug], clean inside a third-party iframe) and the /age interstitial (which must not
  // load ads or expose any of the site before the visitor confirms their age).
  const bare = pathname.startsWith("/embed") || pathname === "/age";
  const showShorts = shortsShownFromCookie((await cookies()).get(SHOW_SHORTS_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${unbounded.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers showShorts={showShorts}>
            {bare ? (
              children
            ) : (
              <>
                <SiteHeader />
                <div className="flex flex-1 flex-col">{children}</div>
                <HideOnShorts>
                  <Footer />
                </HideOnShorts>
                <AdLayer />
                <CookieConsent />
              </>
            )}
          </Providers>
        </NextIntlClientProvider>
        {/* Counters run on the embed too (to measure Yandex Video traffic); only the on-page
            chrome/ad overlays are stripped above. */}
        <Analytics />
      </body>
    </html>
  );
}
