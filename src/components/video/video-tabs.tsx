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
 *
 * `videoKey` identifies the current video. /video/[slug] is the same route for every video, so a
 * client-side navigation re-renders this component (often reusing the instance rather than
 * remounting it) — without this, the selected tab would carry over and a new video could open on
 * the previous one's tab (e.g. Screenshots). When `videoKey` changes we reset to the first tab.
 */
export function VideoTabs({ items, videoKey }: { items: TabItem[]; videoKey: string }) {
  const [selected, setSelected] = useState<{ videoKey: string; key: string | undefined }>({
    videoKey,
    key: items[0]?.key,
  });

  if (!items.length) return null;

  // Reset to the first (info) tab when the video changes, or if the remembered key is gone. Done
  // during render so the right tab paints immediately, with no remount required.
  let active = selected.key;
  if (selected.videoKey !== videoKey || !items.some((it) => it.key === active)) {
    active = items[0].key;
    setSelected({ videoKey, key: active });
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
            onClick={() => setSelected({ videoKey, key: it.key })}
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
