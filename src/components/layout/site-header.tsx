import { getLocale } from "next-intl/server";
import { getCategories } from "@/lib/api/taxonomy";
import type { Locale } from "@/lib/i18n/locales";
import { CategoriesDisclosureProvider } from "./categories-disclosure";
import { CategoryGrid } from "./category-grid";
import { Header } from "./header";

/** Server wrapper: fetches categories once for the header nav + expandable panel. */
export async function SiteHeader() {
  const lang = (await getLocale()) as Locale;
  const categories = await getCategories({ lang, pageSize: 35 });
  return (
    <CategoriesDisclosureProvider>
      <Header categoryPanel={<CategoryGrid categories={categories} />} />
    </CategoriesDisclosureProvider>
  );
}
