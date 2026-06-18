"use client";

import { useEffect, useRef } from "react";
import type { AdSlot } from "@/lib/api/ads";
import { isUrl } from "@/lib/ads";

/** Re-create every <script> inside `host` so the browser actually executes it (innerHTML won't). */
function executeScripts(host: HTMLElement) {
  host.querySelectorAll("script").forEach((old) => {
    const s = document.createElement("script");
    for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
    s.text = old.textContent ?? "";
    old.parentNode?.replaceChild(s, old);
  });
}

/** Normalize the `script` field (external URL, raw markup, or inline JS) into HTML markup. */
function scriptToMarkup(script: string): string {
  const s = script.trim();
  if (!s) return "";
  if (isUrl(s)) return `<script src="${s}" async></script>`;
  if (s.includes("<")) return s; // ad tag already contains markup/script
  return `<script>${s}</script>`; // bare inline JS
}

/**
 * Renders an ad-slot's `html` + `script`. Both may contain arbitrary ad markup with inline
 * <script> tags; we inject as HTML and then re-create the scripts so they run.
 */
export function AdSlotRender({ slot, className }: { slot: AdSlot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = (slot.html ?? "") + scriptToMarkup(slot.script ?? "");
    executeScripts(host);
    return () => {
      host.innerHTML = "";
    };
  }, [slot]);

  return <div ref={ref} className={className} data-ad-slot={slot.code} />;
}
