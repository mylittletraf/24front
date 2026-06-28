"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const INCH_TO_CM = 2.54;

/** Convert the numeric groups in an inch measurements string (e.g. "34-23-34") to cm, keeping the
 *  original separators. Returns null if there are no numbers to convert. */
function toCm(value: string): string | null {
  if (!/\d/.test(value)) return null;
  return value.replace(/\d+(?:\.\d+)?/g, (n) => String(Math.round(parseFloat(n) * INCH_TO_CM)));
}

/**
 * Measurements value with a unit toggle. Backend stores inches (e.g. "34-23-34"); shown in inches
 * by default with a button that recomputes to cm (×2.54). Falls back to plain text (no button)
 * when the value has no numbers.
 */
export function Measurements({ value }: { value: string }) {
  const t = useTranslations("actor");
  const [cm, setCm] = useState(false);
  const cmValue = toCm(value);

  if (cmValue === null) return <>{value}</>;

  return (
    <span className="inline-flex items-center gap-2">
      {cm ? cmValue : value}
      <button
        type="button"
        onClick={() => setCm((v) => !v)}
        className="text-muted hover:text-foreground text-xs underline-offset-2 hover:underline"
      >
        {cm ? t("toInch") : t("toCm")}
      </button>
    </span>
  );
}
