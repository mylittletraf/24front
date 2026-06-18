import { z } from "zod";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";

export type SeoEntity = "video" | "tag" | "category" | "actor" | "collection";

const OpenGraphSchema = z
  .object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
  })
  .partial();

const TwitterSchema = z
  .object({
    card: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
  })
  .partial();

export const SeoSchema = z.object({
  entity_type: z.string(),
  slug: z.string(),
  language: z.string(),
  fallback_language: z.string().nullable(),
  canonical: z.string(),
  robots: z.string(),
  alternates: z.record(z.string(), z.string()).default({}),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    h1: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    open_graph: OpenGraphSchema.optional(),
    twitter: TwitterSchema.optional(),
  }),
  json_ld: z.unknown().optional(),
});
export type Seo = z.infer<typeof SeoSchema>;

export async function getSeo(entity: SeoEntity, slug: string, lang?: Locale): Promise<Seo | null> {
  try {
    const data = await apiFetch<unknown>(`/seo/${entity}/${slug}/`, {
      params: { lang },
      revalidate: 300,
    });
    const parsed = SeoSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Convert a /seo response into Next Metadata (canonical, hreflang, OG/Twitter, robots). */
export function seoToMetadata(seo: Seo | null): Metadata {
  if (!seo) return {};
  const { meta } = seo;
  const og = meta.open_graph ?? {};
  const tw = meta.twitter ?? {};

  return {
    title: meta.title ?? undefined,
    description: meta.description ?? undefined,
    alternates: {
      canonical: seo.canonical,
      languages: Object.keys(seo.alternates).length ? seo.alternates : undefined,
    },
    robots: seo.robots,
    openGraph: {
      title: og.title ?? meta.title ?? undefined,
      description: og.description ?? meta.description ?? undefined,
      images: og.image ?? meta.image ?? undefined,
      type: (og.type as "website") ?? "website",
      url: seo.canonical,
    },
    twitter: {
      card: (tw.card as "summary_large_image") ?? "summary_large_image",
      title: tw.title ?? meta.title ?? undefined,
      description: tw.description ?? meta.description ?? undefined,
      images: tw.image ?? meta.image ?? undefined,
    },
  };
}
