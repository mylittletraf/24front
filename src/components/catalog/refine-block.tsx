"use client";

import { Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { countryLabel } from "@/lib/utils/country";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { Chip } from "@/components/ui/chip";
import { useFilterNav } from "./use-filter-nav";

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
