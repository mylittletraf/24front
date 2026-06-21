import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ActorFaq } from "@/components/actor/actor-faq";
import { ActorHero } from "@/components/actor/actor-hero";
import { RelatedActors } from "@/components/actor/related-actors";
import { SaveFilterButton } from "@/components/catalog/save-filter-button";
import { Container } from "@/components/layout/container";
import { Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { InfiniteVideoFeed } from "@/components/video/infinite-video-feed";
import { getActor } from "@/lib/api/actors";
import { ApiError } from "@/lib/api/errors";
import type { QueryValue } from "@/lib/api/fetcher";
import { getEntityRelatedFilters } from "@/lib/api/related";
import { getSeo, seoToMetadata } from "@/lib/api/seo";
import { getRedirect } from "@/lib/api/video-detail";
import { getVideoList } from "@/lib/api/videos";
import { emptyFilters } from "@/lib/filters";
import { resolveLocale, type Locale } from "@/lib/i18n/locales";
import { graph, itemListJsonLd, personJsonLd } from "@/lib/seo/structured-data";

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = sp.lang ? resolveLocale(sp.lang) : ((await getLocale()) as Locale);
  return seoToMetadata(await getSeo("actor", slug, lang));
}

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
  const tb = await getTranslations("breadcrumbs");

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

  // The dedicated /actors/{slug}/videos/ endpoint is broken (returns 0); use the
  // working catalog filter instead. See docs/BACKEND_BUGS.md.
  const endpoint = "/videos/";
  const apiParams: Record<string, QueryValue> = { lang, page_size: 24, actors: slug };
  const [initialPage, related] = await Promise.all([
    getVideoList(endpoint, apiParams, { revalidate: 60 }),
    getEntityRelatedFilters("actors", slug, { lang }),
  ]);

  // Person attributes → PropertyValue rows (already localized via the actor namespace).
  const personAttributes = [
    actor.body_type && { name: t("bodyType"), value: actor.body_type.name },
    actor.bra_size && { name: t("braSize"), value: actor.bra_size.name },
    actor.boobs_type && { name: t("boobsType"), value: actor.boobs_type.name },
    actor.hair_color && { name: t("hairColor"), value: actor.hair_color.name },
    actor.eye_color && { name: t("eyeColor"), value: actor.eye_color.name },
  ].filter(Boolean) as { name: string; value: string }[];

  const crumbs: Crumb[] = [
    { name: tb("home"), url: "/" },
    { name: tb("actors"), url: "/actors" },
    { name: actor.name, url: `/actor/${slug}` },
  ];

  // Rich Person + ItemList of the actor's videos (supersedes the minimal backend json_ld).
  const actorGraph = graph(
    personJsonLd(actor, { pageUrl: `/actor/${slug}`, attributes: personAttributes }),
    itemListJsonLd(initialPage.results),
  );

  return (
    <Container className="desktop:py-6 flex flex-col gap-6 py-4">
      <JsonLd data={actorGraph} />
      <Breadcrumbs items={crumbs} />
      <ActorHero actor={actor} />
      <ActorFaq actor={actor} />
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {t("videosWith", { name: actor.name })} ({actor.videos_count})
          </h2>
          <SaveFilterButton
            filters={{ ...emptyFilters, actors: [slug] }}
            labels={{ [slug]: actor.name }}
            count={actor.subscribers_count}
            entity={{ type: "actor", slug }}
            entityName={actor.name}
          />
        </div>
        <InfiniteVideoFeed
          queryKey={["videos", "actor", slug, lang]}
          endpoint={endpoint}
          params={apiParams}
          initialPage={initialPage}
        />
      </section>

      <RelatedActors title={t("relatedActors")} actors={related.related.actors} />
    </Container>
  );
}
