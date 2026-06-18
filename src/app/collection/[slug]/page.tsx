import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { getCollection } from "@/lib/api/collections";
import { ApiError } from "@/lib/api/errors";
import type { QueryValue } from "@/lib/api/fetcher";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideoList } from "@/lib/api/videos";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { sanitizeHtml } from "@/lib/utils/sanitize";

export const revalidate = 300;

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("collections");

  let collection;
  try {
    collection = await getCollection(slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, "collection", lang);
      if (r.redirect && r.new_slug) redirect(`/collection/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  const endpoint = `/collections/${slug}/videos/`;
  const apiParams: Record<string, QueryValue> = { lang, page_size: 24 };
  const initialPage = await getVideoList(endpoint, apiParams, { revalidate: 60 });

  return (
    <Container className="desktop:py-6 flex flex-col gap-6 py-4">
      <section className="desktop:min-h-[400px] relative min-h-[250px] overflow-hidden rounded-2xl">
        {collection.cover_image ? (
          <Image
            src={collection.cover_image}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="bg-surface absolute inset-0" />
        )}
        <div className="bg-overlay absolute inset-0" />
        <div className="desktop:min-h-[400px] desktop:flex-row desktop:items-end desktop:justify-between relative flex min-h-[250px] flex-col justify-end gap-3 p-6 text-white">
          <div className="flex flex-col gap-2">
            <h1 className="desktop:text-4xl text-2xl font-bold">
              {collection.h1 || collection.title}
            </h1>
            {collection.short_description ? (
              <p className="max-w-2xl text-sm opacity-90">{collection.short_description}</p>
            ) : null}
          </div>
          {collection.cover_poster ? (
            <div className="relative aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-xl shadow-lg">
              <Image
                src={collection.cover_poster}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </section>

      {collection.content ? (
        <div
          className="prose max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(collection.content) }}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("videos")}</h2>
        <InfiniteVideoFeed
          queryKey={["videos", "collection", slug, lang]}
          endpoint={endpoint}
          params={apiParams}
          initialPage={initialPage}
        />
      </section>
    </Container>
  );
}
