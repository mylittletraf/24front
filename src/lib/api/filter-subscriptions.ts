import { z } from "zod";
import { ACTOR_ATTR_KEYS, emptyFilters, type VideoFilters } from "@/lib/filters";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";
import { VideoCardSchema, type VideoCard } from "./types";

export const FilterSubscriptionSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
  include_tags: z.string().default(""),
  exclude_tags: z.string().default(""),
  categories: z.string().default(""),
  studios: z.string().default(""),
  actors: z.string().default(""),
  q: z.string().default(""),
  duration_min: z.number().nullable().default(null),
  duration_max: z.number().nullable().default(null),
  actor_country: z.string().default(""),
  actor_body_type: z.string().default(""),
  actor_bra_size: z.string().default(""),
  actor_boobs_type: z.string().default(""),
  actor_hair_color: z.string().default(""),
  actor_eye_color: z.string().default(""),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type FilterSubscription = z.infer<typeof FilterSubscriptionSchema>;

const FeedGroupSchema = z.object({
  subscription: FilterSubscriptionSchema,
  total: z.number().default(0),
  videos: z.array(VideoCardSchema).catch([]),
});
const FeedBucketSchema = z.object({
  label: z.string(),
  date_from: z.string(),
  date_to: z.string(),
  groups: z.array(FeedGroupSchema).catch([]),
});
const FeedSchema = z.object({ buckets: z.array(FeedBucketSchema).catch([]) });

export type FeedBucket = z.infer<typeof FeedBucketSchema>;
export type FeedGroup = z.infer<typeof FeedGroupSchema>;
export type Feed = z.infer<typeof FeedSchema>;

/** Fields accepted by POST/PATCH /me/filter-subscriptions/. */
export interface SubscriptionInput {
  name?: string;
  is_active?: boolean;
  sort_order?: number;
  include_tags?: string;
  exclude_tags?: string;
  categories?: string;
  studios?: string;
  actors?: string;
  q?: string;
  duration_min?: number | null;
  duration_max?: number | null;
  actor_country?: string;
  actor_body_type?: string;
  actor_bra_size?: string;
  actor_boobs_type?: string;
  actor_hair_color?: string;
  actor_eye_color?: string;
}

/** Entity a Subscribe button can follow (single-base subscription). */
export type SubscriptionEntityType = "category" | "tag" | "studio" | "actor";
export interface SubscriptionEntity {
  type: SubscriptionEntityType;
  slug: string;
}

const SubStateSchema = z.object({
  subscribed: z.boolean(),
  subscription_uuid: z.string().nullable(),
});
export type SubscriptionEntityState = z.infer<typeof SubStateSchema>;
const SubStateMapSchema = z.record(z.string(), SubStateSchema);

/** Key used in the state map / React Query for one entity. */
export const subscriptionKey = (e: SubscriptionEntity) => `${e.type}:${e.slug}`;

/**
 * Batched "is the user subscribed to these entities?" — mirrors /me/videos/state/.
 * Returns `{ "<type>:<slug>": { subscribed, subscription_uuid } }` (single-base subscriptions).
 */
export async function getSubscriptionsState(
  entities: SubscriptionEntity[],
  token: string,
): Promise<Record<string, SubscriptionEntityState>> {
  if (entities.length === 0) return {};
  const data = await apiFetch<unknown>("/me/subscriptions/state/", {
    method: "POST",
    body: { entities: entities.slice(0, 200) },
    token,
    cache: "no-store",
  });
  const parsed = SubStateMapSchema.safeParse(data);
  return parsed.success ? parsed.data : {};
}

export async function listSubscriptions(token: string): Promise<FilterSubscription[]> {
  const data = await apiFetch<unknown>("/me/filter-subscriptions/", { token, cache: "no-store" });
  const parsed = z.array(FilterSubscriptionSchema).safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function createSubscription(
  token: string,
  body: SubscriptionInput & { name: string },
): Promise<FilterSubscription> {
  const data = await apiFetch<unknown>("/me/filter-subscriptions/", {
    method: "POST",
    body,
    token,
  });
  return FilterSubscriptionSchema.parse(data);
}

export async function updateSubscription(
  token: string,
  uuid: string,
  patch: SubscriptionInput,
): Promise<FilterSubscription> {
  const data = await apiFetch<unknown>(`/me/filter-subscriptions/${uuid}/`, {
    method: "PATCH",
    body: patch,
    token,
  });
  return FilterSubscriptionSchema.parse(data);
}

export async function deleteSubscription(token: string, uuid: string): Promise<void> {
  await apiFetch(`/me/filter-subscriptions/${uuid}/`, { method: "DELETE", token });
}

export async function getFeed(token: string, lang: Locale): Promise<Feed> {
  const data = await apiFetch<unknown>("/me/feed/", { params: { lang }, token, cache: "no-store" });
  const parsed = FeedSchema.safeParse(data);
  return parsed.success ? parsed.data : { buckets: [] };
}

/** New-but-unseen count for the feed badge. Returns 0 if the endpoint is unavailable. */
export async function getFeedUnreadCount(token: string): Promise<number> {
  try {
    const data = await apiFetch<{ count?: number }>("/me/feed/unread-count/", {
      token,
      cache: "no-store",
    });
    return typeof data?.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

/** Mark the feed as seen (resets the unread count). Soft-fails. */
export async function markFeedSeen(token: string): Promise<void> {
  try {
    await apiFetch("/me/feed/seen/", { method: "POST", token });
  } catch {
    // ignore — best-effort
  }
}

const csv = (s: string | undefined): string[] =>
  (s ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/** Subscription record (comma-strings) → VideoFilters. */
export function subscriptionToFilters(sub: FilterSubscription): VideoFilters {
  return {
    ...emptyFilters,
    include_tags: csv(sub.include_tags),
    exclude_tags: csv(sub.exclude_tags),
    categories: csv(sub.categories),
    studios: csv(sub.studios),
    actors: csv(sub.actors),
    q: sub.q || undefined,
    duration_min: sub.duration_min ?? undefined,
    duration_max: sub.duration_max ?? undefined,
    actor_country: sub.actor_country || undefined,
    actor_body_type: sub.actor_body_type || undefined,
    actor_bra_size: sub.actor_bra_size || undefined,
    actor_boobs_type: sub.actor_boobs_type || undefined,
    actor_hair_color: sub.actor_hair_color || undefined,
    actor_eye_color: sub.actor_eye_color || undefined,
  };
}

/** VideoFilters → subscription create/patch fields (arrays joined; no sort/lang). */
export function filtersToSubscriptionFields(filters: VideoFilters): SubscriptionInput {
  const fields: SubscriptionInput = {};
  if (filters.include_tags.length) fields.include_tags = filters.include_tags.join(",");
  if (filters.exclude_tags.length) fields.exclude_tags = filters.exclude_tags.join(",");
  if (filters.categories.length) fields.categories = filters.categories.join(",");
  if (filters.studios.length) fields.studios = filters.studios.join(",");
  if (filters.actors.length) fields.actors = filters.actors.join(",");
  if (filters.q) fields.q = filters.q;
  if (filters.duration_min !== undefined) fields.duration_min = filters.duration_min;
  if (filters.duration_max !== undefined) fields.duration_max = filters.duration_max;
  for (const key of ACTOR_ATTR_KEYS) {
    const value = filters[key];
    if (value) fields[key] = value;
  }
  return fields;
}

export type { VideoCard };
