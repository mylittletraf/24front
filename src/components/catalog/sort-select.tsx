"use client";

import { useTranslations } from "next-intl";
import type { VideoSort } from "@/lib/api/videos";
import { SORT_OPTIONS, type VideoFilters } from "@/lib/filters";
import { useFilterNav } from "./use-filter-nav";

export function SortSelect({ filters, basePath }: { filters: VideoFilters; basePath: string }) {
  const t = useTranslations("sort");
  const { setSort } = useFilterNav(basePath, filters);
  const value = filters.sort ?? "newest";

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{t("label")}:</span>
      <select
        value={value}
        onChange={(e) => setSort(e.target.value as VideoSort)}
        className="border-border bg-surface focus:border-muted h-9 rounded-full border px-3 text-sm outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
