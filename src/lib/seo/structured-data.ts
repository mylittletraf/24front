import { ADULT_CONTENT, SITE_NAME, SITE_URL } from "@/lib/api/config";
import type { VideoDetail } from "@/lib/api/video-detail";
import type { Actor, Rating, VideoCard } from "@/lib/api/types";

/** Make a `/media/…` or `/video/…` path absolute; pass through already-absolute URLs. */
export function absolute(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

/** Seconds → ISO-8601 duration (`PT1H2M3S`), as required by schema.org `duration`. */
export function secondsToIso8601(total: number): string {
  const s = Math.max(0, Math.floor(total || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const out = `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
  return out;
}

type Json = Record<string, unknown>;

/** Drop null/undefined/empty-string/empty-array values so the JSON-LD stays clean. */
function compact(obj: Json): Json {
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Subscriber count → schema.org InteractionCounter (SubscribeAction). Omitted when 0/absent. */
function subscribeCounter(n: number | undefined): Json | undefined {
  if (!n || n <= 0) return undefined;
  return {
    "@type": "InteractionCounter",
    interactionType: "https://schema.org/SubscribeAction",
    userInteractionCount: n,
  };
}

/** Genuine AggregateRating (backend `rating`; null until enough votes). */
function aggregateRating(r: Rating | null | undefined): Json | undefined {
  if (!r) return undefined;
  return compact({
    "@type": "AggregateRating",
    ratingValue: r.rating_value,
    ratingCount: r.rating_count,
    bestRating: r.best_rating,
    worstRating: r.worst_rating,
  });
}

/** Wrap nodes into a single `@graph` document (one <script> per page). */
export function graph(...nodes: (Json | Json[] | null | undefined)[]): Json {
  const flat = nodes.flat().filter(Boolean) as Json[];
  return { "@context": "https://schema.org", "@graph": flat };
}

/** BreadcrumbList from an ordered list of crumbs. */
export function breadcrumbJsonLd(items: { name: string; url: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(it.url),
    })),
  };
}

/** ItemList of videos (used on actor/tag/category/collection pages). */
export function itemListJsonLd(videos: Pick<VideoCard, "slug" | "title">[]): Json {
  return {
    "@type": "ItemList",
    numberOfItems: videos.length,
    itemListElement: videos.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(`/video/${v.slug}`),
      name: v.title,
    })),
  };
}

/** CollectionPage wrapping an ItemList — for tag / category / collection listing pages. */
export function collectionPageJsonLd(input: {
  name: string;
  url: string;
  description?: string | null;
  /** Tag synonyms — captures synonymous queries (schema.org `alternateName`). */
  alternateName?: string[];
  dateModified?: string | null;
  subscribersCount?: number;
  videos: Pick<VideoCard, "slug" | "title">[];
}): Json {
  return compact({
    "@type": "CollectionPage",
    name: input.name,
    alternateName:
      input.alternateName && input.alternateName.length ? input.alternateName : undefined,
    url: absolute(input.url),
    description: input.description ?? undefined,
    dateModified: input.dateModified ?? undefined,
    interactionStatistic: subscribeCounter(input.subscribersCount),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: itemListJsonLd(input.videos),
  });
}

/**
 * Rich VideoObject built entirely from the data the page already has. Supersedes the minimal
 * backend `seo.json_ld`. Includes duration, cast (Person), view/like/comment counts, genre,
 * keywords and the embed/content URLs — the fields Google Video & Yandex Video rank on.
 */
export function videoObjectJsonLd(
  detail: VideoDetail,
  opts: { thumbnails: string[]; pageUrl: string; embedUrl: string; contentUrl: string | null },
): Json {
  const interaction: Json[] = [
    { type: "https://schema.org/WatchAction", count: detail.views_count },
    { type: "https://schema.org/LikeAction", count: detail.likes_count },
    { type: "https://schema.org/CommentAction", count: detail.comments_count },
  ]
    .filter((s) => typeof s.count === "number")
    .map((s) => ({
      "@type": "InteractionCounter",
      interactionType: s.type,
      userInteractionCount: s.count,
    }));

  return compact({
    "@type": "VideoObject",
    name: detail.seo_h1 || detail.title,
    description: detail.seo_description || detail.description || detail.title,
    thumbnailUrl: opts.thumbnails.map(absolute),
    uploadDate: detail.published_at ?? undefined,
    dateModified: detail.date_modified ?? undefined,
    duration: secondsToIso8601(detail.duration),
    url: absolute(opts.pageUrl),
    embedUrl: absolute(opts.embedUrl),
    contentUrl: opts.contentUrl ? absolute(opts.contentUrl) : undefined,
    inLanguage: detail.language,
    isFamilyFriendly: ADULT_CONTENT ? false : undefined,
    genre: detail.categories.map((c) => c.name),
    keywords: detail.tags.map((tg) => tg.name).join(", ") || undefined,
    actor: detail.actors.map((a) => ({
      "@type": "Person",
      name: a.name,
      url: absolute(`/actor/${a.slug}`),
    })),
    productionCompany: detail.studios.map((s) => ({ "@type": "Organization", name: s.name })),
    aggregateRating: aggregateRating(detail.rating),
    interactionStatistic: interaction,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  });
}

/**
 * Person (actor) built from bio/aliases/attributes. `attributes` are passed in already-localized
 * (the page has the translation namespace) as PropertyValue rows for body type / hair colour / etc.
 */
export function personJsonLd(
  actor: Actor,
  opts: { pageUrl: string; attributes: { name: string; value: string }[] },
): Json {
  const genderMap: Record<string, string> = { woman: "female", man: "male" };
  // sameAs = Wikidata entity + external profile links (drives the Knowledge Panel).
  const sameAs = [
    actor.wikidata_id ? `https://www.wikidata.org/wiki/${actor.wikidata_id}` : null,
    ...(actor.external_links ?? []),
  ].filter((u): u is string => Boolean(u));
  return compact({
    "@type": "Person",
    name: actor.name,
    url: absolute(opts.pageUrl),
    image: actor.photo ? absolute(actor.photo) : undefined,
    description: actor.bio || actor.short_bio || undefined,
    gender: genderMap[actor.gender] ?? undefined,
    birthDate: actor.birth_date ?? undefined,
    birthPlace: actor.birth_place ? { "@type": "Place", name: actor.birth_place } : undefined,
    alternateName: actor.aliases && actor.aliases.length ? actor.aliases : undefined,
    nationality: actor.country?.name ? { "@type": "Country", name: actor.country.name } : undefined,
    height: actor.height
      ? { "@type": "QuantitativeValue", value: actor.height, unitCode: "CMT" }
      : undefined,
    weight: actor.weight
      ? { "@type": "QuantitativeValue", value: actor.weight, unitCode: "KGM" }
      : undefined,
    worksFor: (actor.studios ?? []).map((s) => ({ "@type": "Organization", name: s.name })),
    sameAs,
    aggregateRating: aggregateRating(actor.rating),
    interactionStatistic: subscribeCounter(actor.subscribers_count),
    dateModified: actor.date_modified ?? undefined,
    additionalProperty: opts.attributes.map((a) => ({
      "@type": "PropertyValue",
      name: a.name,
      value: a.value,
    })),
  });
}

/** FAQPage from a list of question/answer pairs (actor pages only). */
export function faqPageJsonLd(qa: { question: string; answer: string }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.question,
      acceptedAnswer: { "@type": "Answer", text: x.answer },
    })),
  };
}
