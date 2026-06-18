import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";
import { pageNumberPage, TagSchema, type Tag } from "./types";

const TagPageSchema = pageNumberPage(TagSchema);

interface ListOpts {
  lang?: Locale;
  pageSize?: number;
}

/** Categories for the header grid / categories page (page-number, sorted by sort_order). */
export async function getCategories({ lang, pageSize = 35 }: ListOpts = {}): Promise<Tag[]> {
  try {
    const data = await apiFetch<unknown>("/categories/", {
      params: { lang, page_size: pageSize },
      revalidate: 1800,
    });
    const parsed = TagPageSchema.safeParse(data);
    return parsed.success ? parsed.data.results : [];
  } catch {
    return [];
  }
}

/** Tags list (page-number). */
export async function getTags({ lang, pageSize = 200 }: ListOpts = {}): Promise<Tag[]> {
  try {
    const data = await apiFetch<unknown>("/tags/", {
      params: { lang, page_size: pageSize },
      revalidate: 1800,
    });
    const parsed = TagPageSchema.safeParse(data);
    return parsed.success ? parsed.data.results : [];
  } catch {
    return [];
  }
}
