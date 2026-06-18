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
