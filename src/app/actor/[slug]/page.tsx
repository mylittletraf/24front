import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ActorHero } from "@/components/actor/actor-hero";
import { Container } from "@/components/layout/container";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { getActor } from "@/lib/api/actors";
import { ApiError } from "@/lib/api/errors";
import type { QueryValue } from "@/lib/api/fetcher";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideoList } from "@/lib/api/videos";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";

export const revalidate = 300;

export default async function ActorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  const t = await getTranslations("actor");

  let actor;
  try {
    actor = await getActor(slug, lang);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const r = await getRedirect(slug, "actor", lang);
      if (r.redirect && r.new_slug) redirect(`/actor/${r.new_slug}`);
      notFound();
    }
    throw error;
  }

  const endpoint = `/actors/${slug}/videos/`;
  const apiParams: Record<string, QueryValue> = { lang, page_size: 24 };
  const initialPage = await getVideoList(endpoint, apiParams, { revalidate: 60 });

  return (
    <Container className="desktop:py-6 flex flex-col gap-6 py-4">
      <ActorHero actor={actor} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {t("videosWith", { name: actor.name })} ({actor.videos_count})
        </h2>
        <InfiniteVideoFeed
          queryKey={["videos", "actor", slug, lang]}
          endpoint={endpoint}
          params={apiParams}
          initialPage={initialPage}
        />
      </section>
    </Container>
  );
}
