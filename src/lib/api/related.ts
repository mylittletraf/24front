import { z } from "zod";
import type { QueryValue } from "./fetcher";
import { apiFetch } from "./fetcher";
import { NamedRefSchema, OptionalMedia } from "./types";

export const RelatedTagItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.enum(["tag", "category"]).or(z.string()),
  preview_image: OptionalMedia,
  videos_count: z.number(),
  intersection_count: z.number(),
});
export type RelatedTagItem = z.infer<typeof RelatedTagItemSchema>;

export const RelatedActorItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  type: z.literal("actor").or(z.string()),
  photo: OptionalMedia,
  country: NamedRefSchema.nullable().optional(),
  videos_count: z.number(),
  intersection_count: z.number(),
});
export type RelatedActorItem = z.infer<typeof RelatedActorItemSchema>;

export const RelatedFiltersSchema = z.object({
  base: z.object({
    type: z.string(),
    slug: z.string().nullable(),
    name: z.string().nullable(),
  }),
  total_videos: z.number(),
  language: z.string().optional(),
  fallback_language: z.string().nullable().optional(),
  related: z.object({
    tags: z.array(RelatedTagItemSchema).default([]),
    categories: z.array(RelatedTagItemSchema).default([]),
    actors: z.array(RelatedActorItemSchema).default([]),
    attributes: z.record(z.string(), z.array(RelatedTagItemSchema)).default({}),
  }),
});
export type RelatedFilters = z.infer<typeof RelatedFiltersSchema>;

const EMPTY: RelatedFilters = {
  base: { type: "custom", slug: null, name: null },
  total_videos: 0,
  related: { tags: [], categories: [], actors: [], attributes: {} },
};

async function fetchRelated(path: string, params: Record<string, QueryValue>) {
  try {
    const data = await apiFetch<unknown>(path, { params, cache: "no-store" });
    const parsed = RelatedFiltersSchema.safeParse(data);
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Related filters for arbitrary catalog filters (/videos/related-filters/). */
export function getCatalogRelatedFilters(params: Record<string, QueryValue>) {
  return fetchRelated("/videos/related-filters/", params);
}

/** Related filters for a tag/category/actor page. */
export function getEntityRelatedFilters(
  entity: "tags" | "categories" | "actors",
  slug: string,
  params: Record<string, QueryValue>,
) {
  return fetchRelated(`/${entity}/${slug}/related/`, params);
}
