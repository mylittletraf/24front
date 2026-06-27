import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// The interstitial must never be indexed; bots are routed straight to the real content by the proxy.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Only same-site absolute paths are kept (blocks open-redirect + protocol-relative `//host`). */
function safeNext(next?: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// Bigger touch targets / type on phones, trimmed back on ≥sm screens.
const ACTION = "h-12 w-full text-base sm:h-11 sm:text-sm";

export default async function AgePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations("ageGate");

  // No client JS: confirm is a native form POST, decline is a native link. The gate must work even
  // when hydration doesn't (e.g. blocked dev resources, JS disabled, flaky mobile network).
  // `fixed inset-0` centers it against the viewport regardless of surrounding layout flow.
  return (
    <main className="bg-background fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <div className="border-border bg-background flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border p-8 text-center shadow-xl sm:gap-4 sm:rounded-2xl sm:p-6">
        <h1 className="text-2xl font-semibold sm:text-xl">{t("title")}</h1>
        <p className="text-muted text-base leading-relaxed sm:text-sm">{t("description")}</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:gap-2">
          <form method="post" action="/age/confirm">
            <input type="hidden" name="next" value={safeNext(next)} />
            <button type="submit" className={cn(buttonVariants({ variant: "primary" }), ACTION)}>
              {t("confirm")}
            </button>
          </form>
          <a
            href="https://www.google.com"
            className={cn(buttonVariants({ variant: "secondary" }), ACTION)}
          >
            {t("decline")}
          </a>
        </div>
        <p className="text-muted text-xs">
          {t("notice")}{" "}
          <Link href="/privacy" target="_blank" className="text-link hover:underline">
            {t("policyLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
