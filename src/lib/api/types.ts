import { z } from "zod";

/** Cursor pagination envelope (video feeds, comments). */
export const cursorPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  });

/** Page-number pagination envelope (actors, tags, /me/*, /search/<type>/). */
export const pageNumberPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(item),
  });

export type CursorPage<T> = {
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PageNumberPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export interface ListResult<T> {
  count?: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Parse a paginated (or bare-array) list leniently: invalid items are dropped
 * instead of failing the whole response (defensive against bad backend rows).
 */
export function parseList<S extends z.ZodTypeAny>(item: S, data: unknown): ListResult<z.infer<S>> {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const raw = Array.isArray(data) ? data : Array.isArray(obj.results) ? obj.results : [];
  const results: z.infer<S>[] = [];
  for (const row of raw) {
    const parsed = item.safeParse(row);
    if (parsed.success) results.push(parsed.data);
  }
  return {
    count: typeof obj.count === "number" ? obj.count : undefined,
    next: typeof obj.next === "string" ? obj.next : null,
    previous: typeof obj.previous === "string" ? obj.previous : null,
    results,
  };
}

/** Video card — element of feeds and catalog (FRONTEND_SPEC §2.1). */
export const VideoCardSchema = z.object({
  uuid: z.string(),
  duration: z.number(),
  views_count: z.number(),
  likes_count: z.number(),
  dislikes_count: z.number(),
  comments_count: z.number(),
  published_at: z.string(),
  poster: z.string().nullable(),
  trailer: z.string().nullable(),
  title: z.string(),
  slug: z.string(),
  language: z.string(),
});
export type VideoCard = z.infer<typeof VideoCardSchema>;

/** Minimal tag/actor ref embedded in video detail. */
export const NamedRefSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type NamedRef = z.infer<typeof NamedRefSchema>;

export const VideoCardPageSchema = cursorPage(VideoCardSchema);

/** Tag / category object (FRONTEND_SPEC §4.1). Category = tag with is_category=true. */
export const TagSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  is_category: z.boolean(),
  is_country: z.boolean().optional(),
  is_body_type: z.boolean().optional(),
  is_bra_size: z.boolean().optional(),
  is_boobs_type: z.boolean().optional(),
  is_hair_color: z.boolean().optional(),
  is_eye_color: z.boolean().optional(),
  preview_image: z.string().nullable(),
  sort_order: z.number().optional(),
  videos_count: z.number(),
  description: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_h1: z.string().nullable().optional(),
  language: z.string().optional(),
  fallback_language: z.string().nullable().optional(),
});
export type Tag = z.infer<typeof TagSchema>;

/** Localized attribute ref ({uuid,name,slug}) or null. */
export const AttributeRefSchema = NamedRefSchema.nullable();

/** Actor object (FRONTEND_SPEC §4.2). */
export const ActorSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  gender: z.enum(["woman", "man", "unknown"]).or(z.string()),
  photo: z.string().nullable(),
  cover_image: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  aliases: z.array(z.string()).optional(),
  videos_count: z.number(),
  bio: z.string().nullable().optional(),
  short_bio: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  language: z.string().optional(),
  fallback_language: z.string().nullable().optional(),
  country: AttributeRefSchema.optional(),
  body_type: AttributeRefSchema.optional(),
  bra_size: AttributeRefSchema.optional(),
  boobs_type: AttributeRefSchema.optional(),
  hair_color: AttributeRefSchema.optional(),
  eye_color: AttributeRefSchema.optional(),
});
export type Actor = z.infer<typeof ActorSchema>;
