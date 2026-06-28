/**
 * Country helpers for the case where an editor stores an ISO 3166-1 alpha-2 code (RU, US, UA)
 * in the actor's country attribute instead of a free-text name. We turn the code into an SVG
 * flag (rendered via <CountryFlag>) + a name localized to the current UI/content language.
 * Plain names (not 2-letter codes) are left to the caller to render as-is.
 */

type CountryRef = { name?: string | null; slug?: string | null } | null | undefined;

function asCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
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

/** ISO alpha-2 code (lowercase, for <CountryFlag>) + localized name from a country ref
 *  (trying `name` then `slug`). Null if neither is a recognizable code. */
export function countryDisplay(
  ref: CountryRef,
  locale: string,
): { code: string; name: string } | null {
  for (const value of [ref?.name, ref?.slug]) {
    const name = countryNameFromCode(value, locale);
    if (name) return { code: asCode(value)!.toLowerCase(), name };
  }
  return null;
}

/** ISO alpha-2 code (lowercase) from a country ref, trying `name` then `slug`. "" when none. */
export function countryCode(ref: CountryRef): string {
  const code = asCode(ref?.name) ?? asCode(ref?.slug);
  return code ? code.toLowerCase() : "";
}
