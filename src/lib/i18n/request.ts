import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromAcceptLanguage,
  LOCALE_COOKIE,
  uiLocale,
} from "./locales";

// Locale is chosen automatically (no manual switcher): an explicit NEXT_LOCALE cookie
// wins (set from a ?lang deep link by the proxy), otherwise the browser's
// Accept-Language, then the default. UI strings fall back to en/ru via uiLocale().
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (localeFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE);

  const messages = (await import(`../../messages/${uiLocale(locale)}.json`)).default;
  return { locale, messages };
});
