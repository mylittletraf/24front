import { z } from "zod";
import { apiFetch } from "./fetcher";

export const AdSlotSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  html: z.string().default(""),
  script: z.string().default(""),
  placement: z.string().optional(),
});
export type AdSlot = z.infer<typeof AdSlotSchema>;

/** Load ad-slots by code. Returns a code→slot map; empty/broken responses yield {}. */
export async function getAdSlots(codes: string[]): Promise<Record<string, AdSlot>> {
  if (codes.length === 0) return {};
  try {
    const data = await apiFetch<unknown>("/ad-slots/", {
      params: { codes: codes.join(",") },
      cache: "no-store", // creatives rotate / can be toggled on the backend — never cache
    });
    const parsed = z.array(AdSlotSchema).safeParse(data);
    const map: Record<string, AdSlot> = {};
    for (const slot of parsed.success ? parsed.data : []) map[slot.code] = slot;
    return map;
  } catch {
    return {};
  }
}
