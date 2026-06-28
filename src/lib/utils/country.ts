/**
 * Country helpers for the case where an editor stores an ISO 3166-1 alpha-2 code (RU, US, UA)
 * in the actor's country attribute instead of a free-text name. We turn the code into a flag
 * emoji + a name localized to the current UI/content language. Plain names (not 2-letter codes)
 * are left to the caller to render as-is.
 */

type CountryRef = { name?: string | null; slug?: string | null } | null | undefined;

function asCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** ISO alpha-2 code → flag emoji (🇷🇺). Returns "" when the value isn't a 2-letter code. */
export function flagFromCode(value: string | null | undefined): string {
  const code = asCode(value);
  if (!code) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Localized country name from an alpha-2 code, or null if it isn't a recognizable code. */
export function countryNameFromCode(
  value: string | null | undefined,
  locale: string,
): string | null {
  const code = asCode(value);
  if (!code) return null;
  try {
    const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
}

/** Flag + localized name from a country ref (trying `name` then `slug`). Null if neither is a code. */
export function countryDisplay(
  ref: CountryRef,
  locale: string,
): { flag: string; name: string } | null {
  for (const value of [ref?.name, ref?.slug]) {
    const name = countryNameFromCode(value, locale);
    if (name) return { flag: flagFromCode(value), name };
  }
  return null;
}

/** Flag emoji from a country ref (trying `name` then `slug`). "" when no code is present. */
export function countryFlag(ref: CountryRef): string {
  return flagFromCode(ref?.name) || flagFromCode(ref?.slug);
}
