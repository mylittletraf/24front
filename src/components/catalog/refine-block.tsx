"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { RelatedFilters } from "@/lib/api/related";
import { countryLabel } from "@/lib/utils/country";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { Chip } from "@/components/ui/chip";
import { useFilterNav } from "./use-filter-nav";

export function RefineBlock({
  related,
  filters,
  basePath,
}: {
  related: RelatedFilters;
  filters: VideoFilters;
  basePath: string;
}) {
  const t = useTranslations("refine");
  const { toggleTag, toggleList } = useFilterNav(basePath, filters);

  const { tags, categories, actors } = related.related;
  if (tags.length === 0 && categories.length === 0 && actors.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Chip
            key={c.uuid}
            className="shrink-0"
            state={filters.categories.includes(c.slug) ? "active" : "default"}
            onClick={() => toggleList("categories", c.slug)}
          >
            {filters.categories.includes(c.slug) ? <Check size={14} /> : <Plus size={14} />}
            {c.name}
          </Chip>
        ))}
        {tags.map((tag) => {
          const included = filters.include_tags.includes(tag.slug);
          return (
            <Chip
              key={tag.uuid}
              className="shrink-0"
              state={included ? "active" : "default"}
              onClick={() => toggleTag(tag.slug)}
            >
              {included ? <Check size={14} /> : <Plus size={14} />}#{tag.name}
            </Chip>
          );
        })}
        {actors.map((a) => (
          <Chip
            key={a.uuid}
            className="shrink-0"
            state={filters.actors.includes(a.slug) ? "active" : "default"}
            onClick={() => toggleList("actors", a.slug)}
          >
            {filters.actors.includes(a.slug) ? <Check size={14} /> : <Plus size={14} />}
            {a.name}
          </Chip>
        ))}
      </div>
    </section>
  );
}

export function ActiveFilters({
  filters,
  basePath,
  labels = {},
}: {
  filters: VideoFilters;
  basePath: string;
  /** slug -> localized display name (falls back to slug). */
  labels?: Record<string, string>;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const { removeFrom, setRange, reset } = useFilterNav(basePath, filters);
  const name = (slug: string) => labels[slug] ?? slug;

  const chips: { key: keyof VideoFilters; slug: string; label: string; exclude?: boolean }[] = [
    ...filters.include_tags.map((s) => ({
      key: "include_tags" as const,
      slug: s,
      label: `#${name(s)}`,
    })),
    ...filters.exclude_tags.map((s) => ({
      key: "exclude_tags" as const,
      slug: s,
      label: `#${name(s)}`,
      exclude: true,
    })),
    ...filters.categories.map((s) => ({ key: "categories" as const, slug: s, label: name(s) })),
    ...filters.actors.map((s) => ({ key: "actors" as const, slug: s, label: name(s) })),
  ];

  // Scalar actor-attribute filters (single value each).
  const attrChips = ACTOR_ATTR_KEYS.filter((k) => filters[k]).map((k) => {
    const slug = filters[k] as string;
    return {
      key: k,
      value: k === "actor_country" ? countryLabel(slug, locale) : name(slug),
    };
  });

  if (chips.length === 0 && attrChips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Chip
          key={`${c.key}-${c.slug}`}
          state={c.exclude ? "exclude" : "active"}
          onClick={() => removeFrom(c.key, c.slug)}
        >
          {c.exclude ? <Minus size={14} /> : null}
          {c.label}
          <span aria-hidden>×</span>
        </Chip>
      ))}
      {attrChips.map((c) => (
        <Chip key={c.key} state="active" onClick={() => setRange({ [c.key]: undefined })}>
          {c.value}
          <span aria-hidden>×</span>
        </Chip>
      ))}
      <button type="button" onClick={reset} className="text-link text-sm hover:underline">
        {t("reset")}
      </button>
    </div>
  );
}
