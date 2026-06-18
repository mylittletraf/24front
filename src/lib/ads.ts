/** True if `s` looks like an external URL (script src / direct link) rather than inline code. */
export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
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
