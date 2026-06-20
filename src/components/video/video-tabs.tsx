"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  key: string;
  label: string;
  panel: ReactNode;
}

/**
 * Lightweight tab strip. Every panel is rendered (server-side too) and only toggled with the
 * `hidden` attribute — never unmounted — so the inactive tab's content (e.g. the screenshots)
 * is present in the initial HTML and crawlable. Panels are built in the Server Component and
 * passed in as nodes, so no data fetching happens on the client.
 */
export function VideoTabs({ items }: { items: TabItem[] }) {
  const [active, setActive] = useState(items[0]?.key);
  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="border-border flex gap-1 border-b">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active === it.key}
            onClick={() => setActive(it.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active === it.key
                ? "border-foreground text-foreground"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      {items.map((it) => (
        <div key={it.key} role="tabpanel" hidden={active !== it.key}>
          {it.panel}
        </div>
      ))}
    </div>
  );
}
