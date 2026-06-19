/**
 * Tiny analytics dispatcher: fire one custom event to both Google Analytics 4
 * (`gtag('event', …)`) and Yandex.Metrica (`ym(id, 'reachGoal', …)`).
 *
 * - No-op on the server, when a provider script isn't loaded, or when the env var is empty,
 *   so call sites never need to guard.
 * - GA4: events show up automatically; mark the important ones as conversions in the UI.
 * - Metrica: the `event` name must match a **goal** of type "JavaScript event" created in the
 *   Metrica dashboard (same identifier) to appear in reports.
 *
 * Keep event names in `snake_case` and stable — they're the report keys in both tools.
 */
export type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", event: string, params?: TrackParams) => void;
    ym?: (counterId: number | string, action: string, ...rest: unknown[]) => void;
  }
}

const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, params);
  } catch {
    // never let analytics break the UI
  }
  try {
    if (YM_ID) window.ym?.(YM_ID, "reachGoal", event, params);
  } catch {
    // ignore
  }
}
