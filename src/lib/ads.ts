/** True if `s` looks like an external URL (script src / direct link) rather than inline code. */
export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/**
 * Cooldown gate: returns true (and stamps "now") only if at least `ms` passed since the last
 * success. Persisted in localStorage. Used to space out aggressive formats (e.g. clickunder).
 */
export function cooldownOk(key: string, ms: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(localStorage.getItem(`ad:cd:${key}`) || 0);
    if (Date.now() - last < ms) return false;
    localStorage.setItem(`ad:cd:${key}`, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * Frequency cap: returns true (and increments) while the placement is under `maxPerDay`
 * for today. Persisted in localStorage. Used for aggressive formats (push, clickunder).
 */
export function frequencyOk(key: string, maxPerDay = 1): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().slice(0, 10);
  let rec: { d: string; n: number };
  try {
    const raw = localStorage.getItem(`ad:${key}`);
    rec = raw ? (JSON.parse(raw) as { d: string; n: number }) : { d: today, n: 0 };
  } catch {
    rec = { d: today, n: 0 };
  }
  if (rec.d !== today) rec = { d: today, n: 0 };
  if (rec.n >= maxPerDay) return false;
  rec.n += 1;
  try {
    localStorage.setItem(`ad:${key}`, JSON.stringify(rec));
  } catch {
    // ignore storage errors (private mode, quota)
  }
  return true;
}

/** Clicks within a cycle at which the clickunder fires; after the last it pauses. */
const CLICKUNDER_FIRE_ON = new Set([1, 3, 5]);
const CLICKUNDER_CYCLE_END = 5;

/**
 * Clickunder click cadence for the detail-page player: fire on the 1st, 3rd and 5th click on the
 * video, then pause for `pauseMs` (60 min) before the cycle restarts. Persisted in localStorage so
 * the cadence spans page navigations across the site. Returns the firing click ordinal (1/3/5) — use
 * it to suffix the slot id — or `null` when this click is swallowed (2nd/4th, or during the pause).
 */
export function clickunderClickStep(key: string, pauseMs: number): number | null {
  if (typeof window === "undefined") return null;
  const storeKey = `ad:cu:${key}`;
  let rec: { n: number; until: number };
  try {
    const raw = localStorage.getItem(storeKey);
    rec = raw ? (JSON.parse(raw) as { n: number; until: number }) : { n: 0, until: 0 };
  } catch {
    rec = { n: 0, until: 0 };
  }

  const now = Date.now();
  if (now < rec.until) return null; // inside the 60-minute pause

  const n = rec.n + 1;
  const fire = CLICKUNDER_FIRE_ON.has(n) ? n : null;
  const next = n >= CLICKUNDER_CYCLE_END ? { n: 0, until: now + pauseMs } : { n, until: 0 };
  try {
    localStorage.setItem(storeKey, JSON.stringify(next));
  } catch {
    // ignore storage errors (private mode, quota)
  }
  return fire;
}
