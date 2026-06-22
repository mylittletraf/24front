"use client";

import { useCallback } from "react";
import { clickunderClickStep } from "@/lib/ads";
import { track } from "@/lib/analytics/track";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";

const CLICKUNDER_SLOT = "clickander_play";
const CLICKUNDER_PAUSE_MS = 60 * 60 * 1000; // pause 60 min after the 5th qualifying open

/**
 * Clickunder (popunder) tied to opening a video detail page from a listing. Attach the returned
 * handler to a video card's link `onClick`: on the 1st/3rd/5th such navigation it opens the direct
 * link (slot `clickander_play`, suffixed `_click-1/3/5`), then pauses 60 min before the cadence
 * restarts. `window.open` runs inside the click gesture, so it isn't popup-blocked; the user still
 * navigates to the detail page. Counts only advance when a link is actually configured/loaded.
 */
export function useClickunder(): () => void {
  const slot = useAdSlot(CLICKUNDER_SLOT);
  const link = slot?.script || null;

  return useCallback(() => {
    if (!link) return;
    const step = clickunderClickStep(CLICKUNDER_SLOT, CLICKUNDER_PAUSE_MS);
    if (step === null) return; // 2nd/4th open, or inside the 60-min pause
    track("ad_clickunder", { slot: `${CLICKUNDER_SLOT}_click-${step}` });
    const w = window.open(link, "_blank", "noopener");
    try {
      w?.blur?.();
      window.focus();
    } catch {
      // ignore
    }
  }, [link]);
}
