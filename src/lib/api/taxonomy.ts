import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";
import { parseList, TagSchema, type Tag } from "./types";

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
    return parseList(TagSchema, data).results;
  } catch {
    return [];
  }
}

/** Tags list (page-number). */
export async function getTags({ lang, pageSize = 300 }: ListOpts = {}): Promise<Tag[]> {
  try {
    const data = await apiFetch<unknown>("/tags/", {
      params: { lang, page_size: pageSize },
      revalidate: 1800,
    });
    return parseList(TagSchema, data).results;
  } catch {
    return [];
  }
}

/** Studios list (page-number, sorted by sort_order) for the studios page. */
export async function getStudios({ lang, pageSize = 100 }: ListOpts = {}): Promise<Tag[]> {
  try {
    const data = await apiFetch<unknown>("/studios/", {
      params: { lang, page_size: pageSize },
      revalidate: 1800,
    });
    return parseList(TagSchema, data).results;
  } catch {
    return [];
  }
}

/** Tag / category / studio detail by slug (throws ApiError on 404). */
export async function getTaxonomyDetail(
  kind: "tags" | "categories" | "studios",
  slug: string,
  lang?: Locale,
): Promise<Tag> {
  const data = await apiFetch<unknown>(`/${kind}/${slug}/`, {
    params: { lang },
    revalidate: 300,
  });
  return TagSchema.parse(data);
}
