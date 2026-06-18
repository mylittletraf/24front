"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyField({ value }: { value: string }) {
  const t = useTranslations("common");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied"));
    } catch {
      toast.error(t("networkError"));
    }
  }

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="border-border bg-surface min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
      />
      <Button variant="secondary" size="md" onClick={copy} aria-label={t("copy")}>
        <Copy size={16} />
      </Button>
    </div>
  );
}
