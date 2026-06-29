"use client";

import { Check, Lock, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, chipVariants } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { RelatedFilters } from "@/lib/api/related";
import type { VideoFilters } from "@/lib/filters";
import { cn } from "@/lib/utils/cn";
import { useFilterNav } from "./use-filter-nav";

/** The page's own entity, shown pre-selected and locked (it lives in the path, not the query). */
export type FilterBase = { kind: "categories" | "tags" | "studios"; slug: string; name: string };

interface FiltersProps {
  filters: VideoFilters;
  basePath: string;
  related: RelatedFilters;
  labels: Record<string, string>;
  base?: FilterBase;
}

/** Small muted "· N" facet count appended to an addable chip. */
function Count({ n }: { n: number }) {
  return <span className="text-muted ml-0.5 text-xs font-normal">· {n}</span>;
}

/** Non-removable chip for the entity that owns this page (e.g. the category you're browsing). */
function LockedChip({ label }: { label: string }) {
  return (
    <span className={cn(chipVariants({ state: "active" }), "opacity-90")}>
      <Lock size={12} />
      {label}
    </span>
  );
}

function CatalogFilterControls({
  filters,
  basePath,
  related,
  labels,
  base,
  onApply,
}: FiltersProps & { onApply: () => void }) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const { toggleTag, toggleList, reset } = useFilterNav(basePath, filters);
  const name = (slug: string) => labels[slug] ?? slug;

  const catBase = base?.kind === "categories" ? base.slug : null;
  const tagBase = base?.kind === "tags" ? base.slug : null;

  // Only options that still yield videos for the current combination (intersection_count > 0),
  // minus what's already selected or the locked base.
  const addableCats = related.related.categories.filter(
    (c) => c.intersection_count > 0 && !filters.categories.includes(c.slug) && c.slug !== catBase,
  );
  const addableTags = related.related.tags.filter(
    (g) =>
      g.intersection_count > 0 &&
      !filters.include_tags.includes(g.slug) &&
      !filters.exclude_tags.includes(g.slug) &&
      g.slug !== tagBase,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Categories — multi-select toggle (no exclude). */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
          {t("categoriesLabel")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {base?.kind === "categories" ? <LockedChip label={base.name} /> : null}
          {filters.categories.map((slug) => (
            <Chip key={slug} state="active" onClick={() => toggleList("categories", slug)}>
              <Check size={14} />
              {name(slug)}
              <span aria-hidden>×</span>
            </Chip>
          ))}
          {addableCats.map((c) => (
            <Chip key={c.uuid} onClick={() => toggleList("categories", c.slug)}>
              <Plus size={14} />
              {c.name}
              <Count n={c.intersection_count} />
            </Chip>
          ))}
        </div>
      </section>

      {/* Tags — tri-state: click cycles include → exclude → off. */}
      <section className="flex flex-col gap-1.5">
        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
          {t("tagsLabel")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {base?.kind === "tags" ? <LockedChip label={`#${base.name}`} /> : null}
          {filters.include_tags.map((slug) => (
            <Chip key={slug} state="active" onClick={() => toggleTag(slug)}>
              <Check size={14} />#{name(slug)}
            </Chip>
          ))}
          {filters.exclude_tags.map((slug) => (
            <Chip key={slug} state="exclude" onClick={() => toggleTag(slug)}>
              <Minus size={14} />#{name(slug)}
            </Chip>
          ))}
          {addableTags.map((g) => (
            <Chip key={g.uuid} onClick={() => toggleTag(g.slug)}>
              <Plus size={14} />#{g.name}
              <Count n={g.intersection_count} />
            </Chip>
          ))}
        </div>
        <p className="text-muted text-xs">{t("tagHint")}</p>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={reset}
          className="text-muted hover:text-foreground text-sm font-medium"
        >
          {tc("reset")}
        </button>
        <Button variant="primary" size="md" onClick={onApply} className="flex-1">
          {tc("apply")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Collapsed "Filters" button (next to sort) that opens a right-side drawer with the chip-based
 * filter controls — same on desktop and mobile so the panel never eats page space when unused.
 */
export function CatalogFilters(props: FiltersProps) {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const activeCount =
    props.filters.categories.length +
    props.filters.include_tags.length +
    props.filters.exclude_tags.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="md">
          <SlidersHorizontal size={16} />
          {tc("filters")}
          {activeCount > 0 ? (
            <span className="bg-accent text-on-accent grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent side="right" className="gap-4">
        <DialogTitle className="text-lg font-semibold">{tc("filters")}</DialogTitle>
        <CatalogFilterControls {...props} onApply={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
