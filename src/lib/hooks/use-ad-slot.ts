"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdSlots, type AdSlot } from "@/lib/api/ads";

/**
 * Returns the configured ad-slot for `code`, or null when it's missing/inactive/empty.
 * A slot with empty html & script (or absent — e.g. backend is_active=false) renders nothing.
 */
export function useAdSlot(code: string): AdSlot | null {
  const { data } = useQuery({
    queryKey: ["ad-slots", code],
    queryFn: () => getAdSlots([code]),
    staleTime: 5 * 60_000,
  });
  const slot = data?.[code];
  return slot && (slot.html || slot.script) ? slot : null;
}
