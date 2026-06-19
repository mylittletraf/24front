"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics/track";

/** Map a chip href to the taxonomy kind it points at (see the video page metadata links). */
function kindFromHref(href: string): string | null {
  if (href.startsWith("/actor/")) return "actor";
  if (href.startsWith("/category/")) return "category";
  if (href.startsWith("/tag/")) return "tag";
  if (href.startsWith("/?")) return "attribute";
  return null;
}

/**
 * Click boundary around server-rendered taxonomy chips: delegates clicks to the inner
 * <a> and fires `taxonomy_click` with the inferred kind — no need to make each chip a
 * client component.
 */
export function TrackTaxonomy({ children }: { children: ReactNode }) {
  return (
    <div
      onClick={(e) => {
        const link = (e.target as HTMLElement).closest("a");
        const kind = link && kindFromHref(link.getAttribute("href") ?? "");
        if (kind) track("taxonomy_click", { kind, href: link!.getAttribute("href") ?? "" });
      }}
    >
      {children}
    </div>
  );
}
