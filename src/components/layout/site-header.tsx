import { getCategories } from "@/lib/api/taxonomy";
import { CategoryGrid } from "./category-grid";
import { Header } from "./header";

/** Server wrapper: fetches categories once for the header + sticky grid. */
export async function SiteHeader() {
  const categories = await getCategories({ pageSize: 35 });
  return (
    <>
      <Header categories={categories} />
      <CategoryGrid categories={categories} />
    </>
  );
}
