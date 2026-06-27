"use client";

import { ADULT_CONTENT } from "@/lib/api/config";
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { AGE_VERIFIED_COOKIE } from "@/lib/legal";
import { CatfishAd } from "./catfish-ad";
import { InPagePushAd } from "./inpage-push-ad";

function ageVerified(): boolean {
  return document.cookie.split("; ").some((c) => c === `${AGE_VERIFIED_COOKIE}=1`);
}

/**
 * Global ad container: picks the device-appropriate overlay format so the wrong device's
 * ad script never loads. Catfish on mobile, in-page push on desktop (≥1024px). No ad script runs
 * before the visitor confirms their age — on adult builds we hold off until the 18+ cookie is set
 * (humans are routed through /age by the proxy; this also covers gate-exempt pages like /privacy).
 */
export function AdLayer() {
  const mounted = useMounted();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  if (!mounted) return null;
  if (ADULT_CONTENT && !ageVerified()) return null;
  return isDesktop ? <InPagePushAd /> : <CatfishAd />;
}
