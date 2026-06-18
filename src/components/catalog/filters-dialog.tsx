"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VideoFilters } from "@/lib/filters";
import { useFilterNav } from "./use-filter-nav";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-muted";

export function FiltersDialog({ filters, basePath }: { filters: VideoFilters; basePath: string }) {
  const t = useTranslations("catalog");
  const { setRange } = useFilterNav(basePath, filters);
  const [open, setOpen] = useState(false);
  const [durationMin, setDurationMin] = useState(filters.duration_min?.toString() ?? "");
  const [durationMax, setDurationMax] = useState(filters.duration_max?.toString() ?? "");

  function apply() {
    setRange({
      duration_min: durationMin ? Number(durationMin) : undefined,
      duration_max: durationMax ? Number(durationMax) : undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="md">
          <SlidersHorizontal size={16} />
          {t("filters")}
        </Button>
      </DialogTrigger>
      <DialogContent side="center" className="gap-4">
        <DialogTitle className="text-lg font-semibold">{t("filters")}</DialogTitle>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t("durationFrom")}</span>
            <input
              type="number"
              min={0}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">{t("durationTo")}</span>
            <input
              type="number"
              min={0}
              value={durationMax}
              onChange={(e) => setDurationMax(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost" size="md">
              ✕
            </Button>
          </DialogClose>
          <Button variant="primary" size="md" onClick={apply}>
            {t("apply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
