"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { VideoSort } from "@/lib/api/videos";
import { filtersToSearchString, type VideoFilters } from "@/lib/filters";

type ListKey = "categories" | "actors";

export function useFilterNav(basePath: string, filters: VideoFilters) {
  const router = useRouter();

  const go = useCallback(
    (next: VideoFilters) => {
      router.push(`${basePath}${filtersToSearchString(next)}`, { scroll: false });
    },
    [basePath, router],
  );

  /** Tag chips cycle: none → include → exclude → none. */
  const toggleTag = useCallback(
    (slug: string) => {
      const inInclude = filters.include_tags.includes(slug);
      const inExclude = filters.exclude_tags.includes(slug);
      let include_tags = filters.include_tags;
      let exclude_tags = filters.exclude_tags;
      if (!inInclude && !inExclude) {
        include_tags = [...include_tags, slug];
      } else if (inInclude) {
        include_tags = include_tags.filter((s) => s !== slug);
        exclude_tags = [...exclude_tags, slug];
      } else {
        exclude_tags = exclude_tags.filter((s) => s !== slug);
      }
      go({ ...filters, include_tags, exclude_tags });
    },
    [filters, go],
  );

  /** Category/actor chips toggle in/out (include-only). */
  const toggleList = useCallback(
    (key: ListKey, slug: string) => {
      const list = filters[key];
      const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
      go({ ...filters, [key]: next });
    },
    [filters, go],
  );

  const removeFrom = useCallback(
    (key: keyof VideoFilters, slug: string) => {
      const list = filters[key];
      if (Array.isArray(list)) {
        go({ ...filters, [key]: list.filter((s) => s !== slug) });
      }
    },
    [filters, go],
  );

  const setSort = useCallback((sort: VideoSort) => go({ ...filters, sort }), [filters, go]);

  const setRange = useCallback(
    (patch: Partial<VideoFilters>) => go({ ...filters, ...patch }),
    [filters, go],
  );

  const reset = useCallback(() => router.push(basePath, { scroll: false }), [basePath, router]);

  return { toggleTag, toggleList, removeFrom, setSort, setRange, reset };
}
