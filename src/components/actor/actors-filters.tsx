"use client";

import * as Slider from "@radix-ui/react-slider";
import { ChevronDown, Plus, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActorSort } from "@/lib/api/actors";
import { cn } from "@/lib/utils/cn";

export interface AttributeOption {
  slug: string;
  name: string;
}
export interface ActorAttributes {
  countries: AttributeOption[];
  bodyTypes: AttributeOption[];
  braSizes: AttributeOption[];
  boobsTypes: AttributeOption[];
  hairColors: AttributeOption[];
  eyeColors: AttributeOption[];
}

type Current = Record<string, string | undefined>;

const HEIGHT = { min: 140, max: 200 };
const WEIGHT = { min: 40, max: 120 };

type AttrDef =
  | { key: string; type: "select"; label: string; options: AttributeOption[] }
  | {
      key: string;
      type: "range";
      label: string;
      unit: string;
      bounds: { min: number; max: number };
      minKey: string;
      maxKey: string;
    };

/** Build /actors navigation that preserves current params. */
function useActorsNav(current: Current) {
  const router = useRouter();
  const update = (patch: Current) => {
    const params = new URLSearchParams();
    const next = { ...current, ...patch };
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/actors?${qs}` : "/actors", { scroll: false });
  };
  const reset = () => router.push("/actors", { scroll: false });
  return { update, reset };
}

function FieldShell({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <span className="text-muted px-0.5 text-xs font-medium">{label}</span>
      <div className="flex items-center gap-1">
        {children}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="remove"
            className="text-muted hover:bg-surface grid h-8 w-8 shrink-0 place-items-center rounded-full"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FieldSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  onRemove,
  allowEmpty = true,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: AttributeOption[];
  onChange: (v: string) => void;
  onRemove?: () => void;
  allowEmpty?: boolean;
}) {
  return (
    <FieldShell label={label} onRemove={onRemove}>
      <div className="relative">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-border bg-surface focus:border-muted h-9 w-44 appearance-none rounded-lg border pr-8 pl-3 text-sm outline-none"
        >
          {allowEmpty ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="text-muted pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
        />
      </div>
    </FieldShell>
  );
}

function FieldRange({
  label,
  unit,
  bounds,
  value,
  onCommit,
  onRemove,
}: {
  label: string;
  unit: string;
  bounds: { min: number; max: number };
  value: [number, number];
  onCommit: (v: [number, number]) => void;
  onRemove?: () => void;
}) {
  const [local, setLocal] = useState<[number, number]>(value);
  return (
    <FieldShell label={`${label}: ${local[0]}–${local[1]} ${unit}`} onRemove={onRemove}>
      <div className="border-border bg-surface flex h-9 w-44 items-center rounded-lg border px-3">
        <Slider.Root
          className="relative flex h-5 w-full touch-none items-center"
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={local}
          onValueChange={(v) => setLocal([v[0], v[1]])}
          onValueCommit={(v) => onCommit([v[0], v[1]])}
          minStepsBetweenThumbs={1}
        >
          <Slider.Track className="bg-surface-2 relative h-1 grow rounded-full">
            <Slider.Range className="bg-accent absolute h-full rounded-full" />
          </Slider.Track>
          <Slider.Thumb className="border-border bg-background block h-4 w-4 rounded-full border shadow" />
          <Slider.Thumb className="border-border bg-background block h-4 w-4 rounded-full border shadow" />
        </Slider.Root>
      </div>
    </FieldShell>
  );
}

/** Sort control — rendered separately (right side on desktop). */
function SortControl({ current }: { current: Current }) {
  const t = useTranslations("actorsFilters");
  const tSort = useTranslations("sort");
  const { update } = useActorsNav(current);
  return (
    <FieldSelect
      label={tSort("label")}
      placeholder={t("sortPopular")}
      value={current.sort ?? "popular"}
      allowEmpty={false}
      options={[
        { slug: "popular", name: t("sortPopular") },
        { slug: "name", name: t("sortName") },
        { slug: "newest", name: t("sortNewest") },
      ]}
      onChange={(v) => update({ sort: (v as ActorSort) || undefined })}
    />
  );
}

/** Attribute filter constructor (no sort). Shared by desktop bar and mobile modal. */
function FilterControls({
  attributes,
  current,
  layout,
}: {
  attributes: ActorAttributes;
  current: Current;
  layout: "row" | "wrap";
}) {
  const t = useTranslations("actorsFilters");
  const tCommon = useTranslations("common");
  const { update, reset } = useActorsNav(current);
  const [added, setAdded] = useState<string[]>([]);

  const isWoman = current.gender === "woman";

  const numAt = (key: string, fallback: number) => {
    const v = current[key];
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };

  const defs: AttrDef[] = [
    { key: "country", type: "select", label: t("country"), options: attributes.countries },
    { key: "body_type", type: "select", label: t("bodyType"), options: attributes.bodyTypes },
    { key: "hair_color", type: "select", label: t("hairColor"), options: attributes.hairColors },
    { key: "eye_color", type: "select", label: t("eyeColor"), options: attributes.eyeColors },
    ...(isWoman
      ? ([
          { key: "bra_size", type: "select", label: t("braSize"), options: attributes.braSizes },
          {
            key: "boobs_type",
            type: "select",
            label: t("boobsType"),
            options: attributes.boobsTypes,
          },
        ] as AttrDef[])
      : []),
    {
      key: "height",
      type: "range",
      label: t("height"),
      unit: "см",
      bounds: HEIGHT,
      minKey: "height_min",
      maxKey: "height_max",
    },
    {
      key: "weight",
      type: "range",
      label: t("weight"),
      unit: "кг",
      bounds: WEIGHT,
      minKey: "weight_min",
      maxKey: "weight_max",
    },
  ];

  const hasValue = (def: AttrDef) =>
    def.type === "select"
      ? Boolean(current[def.key])
      : Boolean(current[def.minKey] || current[def.maxKey]);

  const shown = defs.filter((def) => hasValue(def) || added.includes(def.key));
  const remaining = defs.filter((def) => !shown.includes(def));

  function removeField(def: AttrDef) {
    setAdded((a) => a.filter((k) => k !== def.key));
    if (def.type === "select") update({ [def.key]: undefined });
    else update({ [def.minKey]: undefined, [def.maxKey]: undefined });
  }

  return (
    <div
      className={cn(
        "items-end gap-3",
        layout === "row" ? "no-scrollbar flex overflow-x-auto pb-1" : "flex flex-wrap gap-y-3",
      )}
    >
      {/* Gender — segmented */}
      <div className="flex shrink-0 flex-col gap-1">
        <span className="text-muted px-0.5 text-xs font-medium">{t("gender")}</span>
        <div className="border-border bg-surface inline-flex rounded-lg border p-0.5">
          {[
            { v: "", l: t("any") },
            { v: "woman", l: t("women") },
            { v: "man", l: t("men") },
          ].map((opt) => {
            const active = (current.gender ?? "") === opt.v;
            return (
              <button
                key={opt.v || "any"}
                type="button"
                onClick={() => update({ gender: opt.v || undefined })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                {opt.l}
              </button>
            );
          })}
        </div>
      </div>

      {shown.map((def) =>
        def.type === "select" ? (
          <FieldSelect
            key={def.key}
            label={def.label}
            placeholder={tCommon("select")}
            value={current[def.key] ?? ""}
            options={def.options}
            onChange={(v) => update({ [def.key]: v || undefined })}
            onRemove={() => removeField(def)}
          />
        ) : (
          <FieldRange
            key={def.key}
            label={def.label}
            unit={def.unit}
            bounds={def.bounds}
            value={[numAt(def.minKey, def.bounds.min), numAt(def.maxKey, def.bounds.max)]}
            onCommit={([min, max]) =>
              update({
                [def.minKey]: min > def.bounds.min ? String(min) : undefined,
                [def.maxKey]: max < def.bounds.max ? String(max) : undefined,
              })
            }
            onRemove={() => removeField(def)}
          />
        ),
      )}

      <div className="flex shrink-0 items-center gap-3 self-end pb-1">
        {remaining.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <Plus size={16} />
                {tCommon("addFilter")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {remaining.map((def) => (
                <DropdownMenuItem key={def.key} onSelect={() => setAdded((a) => [...a, def.key])}>
                  {def.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setAdded([]);
            reset();
          }}
          className="text-link text-sm whitespace-nowrap hover:underline"
        >
          {tCommon("reset")}
        </button>
      </div>
    </div>
  );
}

/** Desktop single-row filter bar with sort pinned to the right. */
export function ActorsFiltersBar(props: { attributes: ActorAttributes; current: Current }) {
  return (
    <div className="desktop:flex hidden items-end gap-4">
      <div className="min-w-0 flex-1">
        <FilterControls {...props} layout="row" />
      </div>
      <SortControl current={props.current} />
    </div>
  );
}

/** Narrow-screen "Filters" button + modal (sort included inside). Place next to the heading. */
export function ActorsFiltersTrigger(props: { attributes: ActorAttributes; current: Current }) {
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <div className="desktop:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="md">
            <SlidersHorizontal size={16} />
            {tCommon("filters")}
          </Button>
        </DialogTrigger>
        <DialogContent side="bottom" className="gap-4 pt-10">
          <DialogTitle className="text-lg font-semibold">{tCommon("filters")}</DialogTitle>
          <FilterControls {...props} layout="wrap" />
          <SortControl current={props.current} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
