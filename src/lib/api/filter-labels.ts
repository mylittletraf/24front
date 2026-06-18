import type { Locale } from "@/lib/i18n/locales";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { getActor, getActorAttributes } from "./actors";
import { getTaxonomyDetail } from "./taxonomy";

/**
 * Resolve localized display names for the slugs in the active filters, so chips show
 * "Россия" instead of "rossiya". Only the few active slugs are looked up.
 */
export async function getFilterLabels(
  filters: VideoFilters,
  lang: Locale,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};
  const add = (slug: string, name?: string | null) => {
    if (name) labels[slug] = name;
  };

  const jobs: Promise<unknown>[] = [];

  if (ACTOR_ATTR_KEYS.some((k) => filters[k])) {
    jobs.push(
      getActorAttributes(lang).then((attrs) => {
        for (const group of Object.values(attrs)) {
          for (const item of group) add(item.slug, item.name);
        }
      }),
    );
  }

  for (const slug of filters.categories) {
    jobs.push(
      getTaxonomyDetail("categories", slug, lang)
        .then((d) => add(slug, d.name))
        .catch(() => undefined),
    );
  }
  for (const slug of [...filters.include_tags, ...filters.exclude_tags]) {
    jobs.push(
      getTaxonomyDetail("tags", slug, lang)
        .then((d) => add(slug, d.name))
        .catch(() => undefined),
    );
  }
  for (const slug of filters.actors) {
    jobs.push(
      getActor(slug, lang)
        .then((a) => add(slug, a.name))
        .catch(() => undefined),
    );
  }

  await Promise.all(jobs);
  return labels;
}
