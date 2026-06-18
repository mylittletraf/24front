import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";
import { OptionalMedia, pageNumberPage, type PageNumberPage } from "./types";

// Collections are empty in the dev dataset; schemas are intentionally lenient.
export const CollectionListItemSchema = z.object({
  uuid: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  h1: z.string().nullable().optional(),
  short_description: z.string().nullable().optional(),
  cover_image: OptionalMedia,
  og_image: z.string().nullable().optional(),
  cover_poster: OptionalMedia,
  videos_count: z.number().optional(),
});
export type CollectionListItem = z.infer<typeof CollectionListItemSchema>;

export const CollectionDetailSchema = CollectionListItemSchema.extend({
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_h1: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  slugs: z.record(z.string(), z.string()).optional(),
  language: z.string().optional(),
  fallback_language: z.string().nullable().optional(),
});
export type CollectionDetail = z.infer<typeof CollectionDetailSchema>;

const CollectionPageSchema = pageNumberPage(CollectionListItemSchema);

export async function getCollections(lang?: Locale): Promise<PageNumberPage<CollectionListItem>> {
  try {
    const data = await apiFetch<unknown>("/collections/", {
      params: { lang, page_size: 50 },
      revalidate: 300,
    });
    const parsed = CollectionPageSchema.safeParse(data);
    return parsed.success ? parsed.data : { count: 0, next: null, previous: null, results: [] };
  } catch {
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export async function getCollection(slug: string, lang?: Locale): Promise<CollectionDetail> {
  const data = await apiFetch<unknown>(`/collections/${slug}/`, {
    params: { lang },
    revalidate: 300,
  });
  return CollectionDetailSchema.parse(data);
}
