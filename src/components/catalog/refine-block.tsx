"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RelatedFilters } from "@/lib/api/related";
import type { VideoFilters } from "@/lib/filters";
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

export function ActiveFilters({ filters, basePath }: { filters: VideoFilters; basePath: string }) {
  const t = useTranslations("common");
  const { removeFrom, reset } = useFilterNav(basePath, filters);

  const chips: { key: keyof VideoFilters; slug: string; label: string; exclude?: boolean }[] = [
    ...filters.include_tags.map((s) => ({ key: "include_tags" as const, slug: s, label: `#${s}` })),
    ...filters.exclude_tags.map((s) => ({
      key: "exclude_tags" as const,
      slug: s,
      label: `#${s}`,
      exclude: true,
    })),
    ...filters.categories.map((s) => ({ key: "categories" as const, slug: s, label: s })),
    ...filters.actors.map((s) => ({ key: "actors" as const, slug: s, label: s })),
  ];

  if (chips.length === 0) return null;

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
      <button type="button" onClick={reset} className="text-link text-sm hover:underline">
        {t("reset")}
      </button>
    </div>
  );
}
