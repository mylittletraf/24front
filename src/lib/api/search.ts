import { z } from "zod";
import type { Locale } from "@/lib/i18n/locales";
import { apiFetch } from "./fetcher";

export const SuggestionSchema = z.object({
  type: z.enum(["tag", "category", "actor"]),
  label: z.string(),
  slug: z.string(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

const SuggestionsSchema = z.array(SuggestionSchema);

export async function getSuggestions(
  q: string,
  lang?: Locale,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  if (q.trim().length < 2) return [];
  const data = await apiFetch<unknown>("/search/suggestions/", {
    params: { q, lang },
    signal,
  });
  const parsed = SuggestionsSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

/** Route a suggestion to its destination page. */
export function suggestionHref(s: Suggestion): string {
  switch (s.type) {
    case "actor":
      return `/actor/${s.slug}`;
    case "category":
      return `/category/${s.slug}`;
    default:
      return `/tag/${s.slug}`;
  }
}
