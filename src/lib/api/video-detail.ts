import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";
import {
  MediaArray,
  NamedRefSchema,
  NullableMedia,
  VideoCardSchema,
  type VideoCard,
} from "./types";

/** Actor ref embedded in a video; gender is optional (shown as a ♀/♂ icon when present). */
const ActorRefSchema = NamedRefSchema.extend({ gender: z.string().optional() });

// One bad attribute row shouldn't break the whole video detail.
const AttrList = z.array(NamedRefSchema).catch([]);
const ActorAttributesSchema = z
  .object({
    country: AttrList,
    body_type: AttrList,
    bra_size: AttrList,
    boobs_type: AttrList,
    hair_color: AttrList,
    eye_color: AttrList,
  })
  .partial()
  .optional();

export const VideoDetailSchema = z.object({
  uuid: z.string(),
  duration: z.number(),
  is_indexable: z.boolean().optional(),
  published_at: z.string(),
  views_count: z.number(),
  likes_count: z.number(),
  dislikes_count: z.number(),
  comments_count: z.number(),
  favorites_count: z.number().optional(),
  trending_score: z.number().optional(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_h1: z.string().nullable().optional(),
  language: z.string(),
  fallback_language: z.string().nullable(),
  sources: z.object({
    mp4: z.unknown().optional(),
    hls: NullableMedia,
    trailer: NullableMedia,
  }),
  screens: MediaArray,
  poster: NullableMedia,
  categories: z.array(NamedRefSchema).default([]),
  tags: z.array(NamedRefSchema).default([]),
  actors: z.array(ActorRefSchema).default([]),
  actor_attributes: ActorAttributesSchema,
  slugs: z.record(z.string(), z.string()).default({}),
});
export type VideoDetail = z.infer<typeof VideoDetailSchema>;

export async function getVideoDetail(slug: string, lang?: Locale): Promise<VideoDetail> {
  const data = await apiFetch<unknown>(`/videos/${slug}/`, {
    params: { lang },
    revalidate: 60,
  });
  return VideoDetailSchema.parse(data);
}

/** Related videos (no pagination). */
export async function getRelatedVideos(slug: string, lang?: Locale): Promise<VideoCard[]> {
  try {
    const data = await apiFetch<unknown>(`/videos/${slug}/related/`, {
      params: { lang },
      revalidate: 300,
    });
    const parsed = z.array(VideoCardSchema).safeParse(data);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Next video card or null. */
export async function getNextVideo(slug: string, lang?: Locale): Promise<VideoCard | null> {
  try {
    const data = await apiFetch<unknown>(`/videos/${slug}/next/`, {
      params: { lang },
      revalidate: 300,
    });
    if (!data) return null;
    const parsed = VideoCardSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const RedirectSchema = z.object({
  redirect: z.boolean(),
  new_slug: z.string().optional(),
  status_code: z.number().optional(),
});

/** Slug redirect lookup used after a 404 on detail pages. */
export async function getRedirect(
  slug: string,
  entityType: "video" | "tag" | "actor" | "collection" | "category",
  lang?: Locale,
): Promise<{ redirect: boolean; new_slug?: string }> {
  try {
    const data = await apiFetch<unknown>("/redirects/", {
      params: { slug, entity_type: entityType, lang },
      cache: "no-store",
    });
    const parsed = RedirectSchema.safeParse(data);
    return parsed.success ? parsed.data : { redirect: false };
  } catch {
    return { redirect: false };
  }
}
