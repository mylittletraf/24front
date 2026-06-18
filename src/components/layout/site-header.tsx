import { getCategories } from "@/lib/api/taxonomy";
import { CategoriesDisclosureProvider } from "./categories-disclosure";
import { CategoryGrid } from "./category-grid";
import { Header } from "./header";

/** Server wrapper: fetches categories once for the header nav + expandable panel. */
export async function SiteHeader() {
  const categories = await getCategories({ pageSize: 35 });
  return (
    <CategoriesDisclosureProvider>
      <Header categories={categories} />
      <CategoryGrid categories={categories} />
    </CategoriesDisclosureProvider>
  );
}
