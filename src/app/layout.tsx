import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdLayer } from "@/components/ads/ad-layer";
import { Analytics } from "@/components/analytics";
import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/api/config";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { siteName: SITE_NAME },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  // The Yandex Video embed (/embed/[slug]) renders only the player — no site chrome,
  // ad overlays or analytics — so it stays clean inside a third-party iframe.
  const isEmbed = (await headers()).get("x-pathname")?.startsWith("/embed") ?? false;

  return (
    <html lang={locale} className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {isEmbed ? (
              children
            ) : (
              <>
                <SiteHeader />
                <div className="flex flex-1 flex-col">{children}</div>
                <Footer />
                <AdLayer />
              </>
            )}
          </Providers>
        </NextIntlClientProvider>
        {!isEmbed && <Analytics />}
      </body>
    </html>
  );
}
