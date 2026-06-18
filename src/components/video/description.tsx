"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Description({ text }: { text: string }) {
  const t = useTranslations("video");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface rounded-xl p-3 text-sm">
      <p className={cn("whitespace-pre-wrap", !expanded && "line-clamp-3")}>{text}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-muted hover:text-foreground mt-1 font-medium"
      >
        {expanded ? t("less") : t("more")}
      </button>
    </div>
  );
}
