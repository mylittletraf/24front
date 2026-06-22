"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ADULT_CONTENT } from "@/lib/api/config";
import { AGE_VERIFIED_COOKIE } from "@/lib/legal";

/**
 * First-visit 18+ confirmation. Rendered inline (no portal) so the blurred backdrop is part of the
 * SSR HTML and shows from the first paint — no flash of the site before the modal appears. The
 * verified state comes from a cookie read on the server ({@link AGE_VERIFIED_COOKIE}) so SSR and the
 * client agree. Skipped on /privacy so the policy stays readable, and only shown for adult content.
 *
 * Declining attempts to close the tab (and redirects away as a fallback, since browsers won't close
 * tabs they didn't open via script).
 */
export function AgeGate({ initialVerified }: { initialVerified: boolean }) {
  const t = useTranslations("ageGate");
  const pathname = usePathname();
  const [verified, setVerified] = useState(initialVerified);

  const open = ADULT_CONTENT && !verified && pathname !== "/privacy";

  function confirm() {
    // ~1 year, readable by the server layout on the next load to render gate-free.
    document.cookie = `${AGE_VERIFIED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    setVerified(true);
  }

  function decline() {
    // Try to close the tab; some browsers only allow this for script-opened windows.
    window.open("", "_self");
    window.close();
    // Fallback for tabs the browser refuses to close: navigate away from the site.
    window.location.replace("https://www.google.com");
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xl"
    >
      <div className="border-border bg-background flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border p-6 text-center shadow-xl">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-muted text-sm leading-relaxed">{t("description")}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Button variant="primary" onClick={confirm}>
            {t("confirm")}
          </Button>
          <Button variant="secondary" onClick={decline}>
            {t("decline")}
          </Button>
        </div>
        <p className="text-muted text-xs">
          {t("notice")}{" "}
          <Link href="/privacy" target="_blank" className="text-link hover:underline">
            {t("policyLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
