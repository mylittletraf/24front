"use client";

import { Zap, ZapOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useShortsPref } from "./shorts-pref";

/**
 * Toggles whether Shorts shelves/tiles appear on listing pages. `icon` for the desktop header action
 * row; `row` for the mobile hamburger drawer (a labelled switch). State comes from the cookie-seeded
 * provider, so it renders consistently on SSR (no flash) and persists across visits.
 */
export function ShortsToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { show, toggle } = useShortsPref();
  const t = useTranslations("nav");
  const label = t("showShorts");

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={show}
        onClick={toggle}
        className="hover:bg-surface flex w-full items-center justify-between gap-3 rounded-md px-2 py-3"
      >
        <span className="flex items-center gap-3 text-lg font-semibold">
          <Zap size={20} className="text-muted" />
          {label}
        </span>
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            show ? "bg-accent" : "bg-surface-2 border-border border",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              show && "translate-x-5",
            )}
          />
        </span>
      </button>
    );
  }

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
