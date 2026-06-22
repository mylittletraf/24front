"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-media-query";

const COOKIE_CONSENT_KEY = "cookie_consent";

/**
 * Bottom cookie-consent banner. Shows once until accepted (remembered in localStorage) and links to
 * the Privacy Policy. Hidden during SSR/first render (via {@link useMounted}) so there's no
 * hydration mismatch and no flash for visitors who already accepted.
 */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const mounted = useMounted();
  const [accepted, setAccepted] = useState(false);

  const open = mounted && !accepted && localStorage.getItem(COOKIE_CONSENT_KEY) !== "1";

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "1");
    setAccepted(true);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="border-border bg-background mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-2xl border p-4 shadow-xl sm:flex-row sm:gap-4">
        <p className="text-muted text-sm leading-relaxed">
          {t("message")}{" "}
          <Link href="/privacy" className="text-link hover:underline">
            {t("learnMore")}
          </Link>
        </p>
        <Button variant="primary" size="sm" className="shrink-0" onClick={accept}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
