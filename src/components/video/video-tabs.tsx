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
  // The set of tab keys identifies the current video's tabs. /video/[slug] is the same route for
  // every video, so a client-side navigation re-renders this component with new `items` but may
  // reuse the instance instead of remounting it — leaving `selected` pointing at the previous
  // video's tab (e.g. Screenshots), which then shows the wrong panel.
  const signature = items.map((it) => it.key).join("|");
  const [selected, setSelected] = useState({ signature, key: items[0]?.key });

  if (!items.length) return null;

  // Reset to the first tab when the tab set changes (new video) or the remembered key is gone.
  // Done during render so the correct tab paints immediately, with no remount required.
  let active = selected.key;
  if (selected.signature !== signature || !items.some((it) => it.key === active)) {
    active = items[0].key;
    setSelected({ signature, key: active });
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="border-border flex gap-1 border-b">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active === it.key}
            onClick={() => setSelected({ signature, key: it.key })}
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
