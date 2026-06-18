import type { Locale } from "@/lib/i18n/locales";

/** Seconds → "MM:SS" or "H:MM:SS" when >= 1 hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Compact counts: <1000 → exact; ≥1000 → "1.2k"; ≥1_000_000 → "1.2M". */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return trimZero(value / 1000) + "k";
  return trimZero(value / 1_000_000) + "M";
}

function trimZero(n: number): string {
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/** ISO date → relative phrase ("2 дня назад") in the given locale. */
export function formatRelativeDate(iso: string, locale: Locale = "ru"): string {
  const date = new Date(iso);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), "year");
}

/** ISO date → localized date like "01.01.1990". */
export function formatDate(iso: string, locale: Locale = "ru"): string {
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US");
}
