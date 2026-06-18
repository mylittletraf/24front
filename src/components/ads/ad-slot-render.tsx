"use client";

import { useEffect, useRef } from "react";
import type { AdSlot } from "@/lib/api/ads";
import { isUrl } from "@/lib/ads";

/**
 * Renders an ad-slot's `html` and runs its `script`. React's dangerouslySetInnerHTML does NOT
 * execute injected <script> tags, so we recreate them; `script` (URL or inline code) is appended.
 */
export function AdSlotRender({ slot, className }: { slot: AdSlot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    host.innerHTML = slot.html ?? "";
    // Re-create <script> elements that came inside html so the browser executes them.
    host.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value);
      s.text = old.textContent ?? "";
      old.replaceWith(s);
    });

    // The `script` field: external loader URL, or inline code.
    if (slot.script) {
      const s = document.createElement("script");
      if (isUrl(slot.script)) s.src = slot.script;
      else s.text = slot.script;
      s.async = true;
      host.appendChild(s);
    }

    return () => {
      host.innerHTML = "";
    };
  }, [slot]);

  return <div ref={ref} className={className} data-ad-slot={slot.code} />;
}
