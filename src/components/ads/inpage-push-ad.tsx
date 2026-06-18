"use client";

import { useEffect } from "react";
import { frequencyOk } from "@/lib/ads";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { AdSlotRender } from "./ad-slot-render";

/** In-page push — desktop only (mounted by AdLayer on large screens). */
export function InPagePushAd() {
  const slot = useAdSlot("in_page");

  // Soft frequency cap as a safety net; most push networks also cap on their side.
  useEffect(() => {
    if (slot) frequencyOk("in_page", 3);
  }, [slot]);

  if (!slot) return null;
  // Most push networks position the unit themselves via their script; the container just hosts it.
  return <AdSlotRender slot={slot} />;
}
