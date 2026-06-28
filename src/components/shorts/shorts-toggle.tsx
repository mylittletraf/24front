"use client";

import { Zap, ZapOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useShortsPref } from "./shorts-pref";

/**
 * Toggles whether Shorts shelves/tiles appear on listing pages. Icon button for the desktop header
 * action row and the mobile hamburger drawer alike. State comes from the cookie-seeded provider, so
 * it renders consistently on SSR (no flash) and persists across visits.
 */
export function ShortsToggle() {
  const { show, toggle } = useShortsPref();
  const t = useTranslations("nav");
  const label = t("showShorts");

  return (
    <Button
      variant="icon"
      size="icon"
      aria-pressed={show}
      aria-label={label}
      title={label}
      onClick={toggle}
      className={cn(show && "text-accent")}
    >
      {show ? <Zap size={20} /> : <ZapOff size={20} />}
    </Button>
  );
}
