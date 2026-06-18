"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useAdSlot } from "@/lib/hooks/use-ad-slot";
import { AdSlotRender } from "./ad-slot-render";

/** Catfish / bottom sticker — mobile only (mounted by AdLayer on small screens). */
export function CatfishAd() {
  const slot = useAdSlot("catfish");
  const [closed, setClosed] = useState(false);
  if (!slot || closed) return null;

  return (
    <div className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 flex justify-center border-t p-1">
      <AdSlotRender slot={slot} className="min-h-[50px] w-full max-w-[360px]" />
      <button
        type="button"
        aria-label="Закрыть"
        onClick={() => setClosed(true)}
        className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
