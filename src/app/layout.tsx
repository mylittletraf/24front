import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@/components/analytics";
import { Footer } from "@/components/layout/footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SITE_URL } from "@/lib/api/config";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "24front", template: "%s — 24front" },
  description: "Tube site",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <SiteHeader />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
