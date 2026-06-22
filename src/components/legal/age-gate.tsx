"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ADULT_CONTENT } from "@/lib/api/config";
import { useMounted } from "@/lib/hooks/use-media-query";

const AGE_VERIFIED_KEY = "age_verified";

/**
 * First-visit 18+ confirmation. Renders a non-dismissible modal over a blurred backdrop until the
 * visitor confirms; the choice is remembered in localStorage. Declining attempts to close the tab
 * (and redirects away as a fallback, since browsers won't close tabs they didn't open via script).
 * Only shown when the catalog is adult content ({@link ADULT_CONTENT}).
 */
export function AgeGate() {
  const t = useTranslations("ageGate");
  const mounted = useMounted();
  const [confirmed, setConfirmed] = useState(false);

  const open =
    mounted && ADULT_CONTENT && !confirmed && localStorage.getItem(AGE_VERIFIED_KEY) !== "1";

  function confirm() {
    localStorage.setItem(AGE_VERIFIED_KEY, "1");
    setConfirmed(true);
  }

  function decline() {
    // Try to close the tab; some browsers only allow this for script-opened windows.
    window.open("", "_self");
    window.close();
    // Fallback for tabs the browser refuses to close: navigate away from the site.
    window.location.replace("https://www.google.com");
  }

  return (
    <Dialog open={open}>
      <DialogContent
        side="center"
        showClose={false}
        overlayClassName="bg-black/50 backdrop-blur-xl"
        className="items-center gap-4 text-center"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-xl font-semibold">{t("title")}</DialogTitle>
        <DialogDescription className="text-muted text-sm leading-relaxed">
          {t("description")}
        </DialogDescription>
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
          <Link href="/privacy" className="text-link hover:underline">
            {t("policyLink")}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
