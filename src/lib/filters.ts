import type { QueryValue } from "@/lib/api/fetcher";
import type { VideoSort } from "@/lib/api/videos";

export interface VideoFilters {
  include_tags: string[];
  exclude_tags: string[];
  categories: string[];
  actors: string[];
  q?: string;
  duration_min?: number;
  duration_max?: number;
  published_after?: string;
  published_before?: string;
  sort?: VideoSort;
}

export const SORT_OPTIONS: { value: VideoSort; labelKey: string }[] = [
  { value: "newest", labelKey: "newest" },
  { value: "oldest", labelKey: "oldest" },
  { value: "popular", labelKey: "popular" },
  { value: "trending", labelKey: "trending" },
  { value: "most_liked", labelKey: "most_liked" },
  { value: "most_viewed", labelKey: "most_viewed" },
  { value: "duration_short", labelKey: "duration_short" },
  { value: "duration_long", labelKey: "duration_long" },
];

type RawParams = Record<string, string | string[] | undefined>;

function csv(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function parseFilters(sp: RawParams): VideoFilters {
  return {
    include_tags: csv(sp.include_tags),
    exclude_tags: csv(sp.exclude_tags),
    categories: csv(sp.categories),
    actors: csv(sp.actors),
    q: str(sp.q),
    duration_min: num(sp.duration_min),
    duration_max: num(sp.duration_max),
    published_after: str(sp.published_after),
    published_before: str(sp.published_before),
    sort: (str(sp.sort) as VideoSort) ?? undefined,
  };
}

/** Backend query params for /videos/ and related-filters (comma-joined lists). */
export function filtersToApiParams(f: VideoFilters): Record<string, QueryValue> {
  return {
    include_tags: f.include_tags.length ? f.include_tags.join(",") : undefined,
    exclude_tags: f.exclude_tags.length ? f.exclude_tags.join(",") : undefined,
    categories: f.categories.length ? f.categories.join(",") : undefined,
    actors: f.actors.length ? f.actors.join(",") : undefined,
    q: f.q,
    duration_min: f.duration_min,
    duration_max: f.duration_max,
    published_after: f.published_after,
    published_before: f.published_before,
    sort: f.sort,
  };
}

/** Serialize filters back into a URLSearchParams string for router navigation. */
export function filtersToSearchString(f: VideoFilters): string {
  const params = new URLSearchParams();
  const apiParams = filtersToApiParams(f);
  for (const [key, value] of Object.entries(apiParams)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(f: VideoFilters): boolean {
  return (
    f.include_tags.length > 0 ||
    f.exclude_tags.length > 0 ||
    f.categories.length > 0 ||
    f.actors.length > 0 ||
    Boolean(f.q || f.duration_min || f.duration_max || f.published_after || f.published_before)
  );
}
