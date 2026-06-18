"use client";

import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { CatfishAd } from "./catfish-ad";
import { InPagePushAd } from "./inpage-push-ad";

/**
 * Global ad container: picks the device-appropriate overlay format so the wrong device's
 * ad script never loads. Catfish on mobile, in-page push on desktop (≥1024px).
 */
export function AdLayer() {
  const mounted = useMounted();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  if (!mounted) return null;
  return isDesktop ? <InPagePushAd /> : <CatfishAd />;
}
