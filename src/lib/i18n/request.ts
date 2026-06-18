import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from "./locales";

// App Router usage without i18n routing: the UI locale comes from a cookie
// (set by the language switcher). Content language is passed to the API via ?lang.
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE);
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
