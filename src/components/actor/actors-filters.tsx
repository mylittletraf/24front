"use client";

import * as Slider from "@radix-ui/react-slider";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActorSort } from "@/lib/api/actors";

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

const selectClass =
  "h-9 rounded-full border border-border bg-surface px-3 text-sm outline-none focus:border-muted disabled:opacity-50";

function AttrSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: AttributeOption[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function RangeFilter({
  label,
  unit,
  bounds,
  value,
  onCommit,
}: {
  label: string;
  unit: string;
  bounds: { min: number; max: number };
  value: [number, number];
  onCommit: (v: [number, number]) => void;
}) {
  const [local, setLocal] = useState<[number, number]>(value);
  return (
    <div className="flex min-w-[180px] flex-col gap-1">
      <span className="text-muted text-xs">
        {label}: {local[0]}–{local[1]} {unit}
      </span>
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
  );
}

export function ActorsFilters({
  attributes,
  current,
}: {
  attributes: ActorAttributes;
  current: Current;
}) {
  const t = useTranslations("actorsFilters");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isWoman = current.gender === "woman";

  function update(patch: Current) {
    const params = new URLSearchParams();
    const next = { ...current, ...patch };
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/actors?${qs}` : "/actors", { scroll: false });
  }

  const num = (key: string, fallback: number) => {
    const v = current[key];
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };

  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      <select
        aria-label={t("gender")}
        value={current.gender ?? ""}
        onChange={(e) => update({ gender: e.target.value || undefined })}
        className={selectClass}
      >
        <option value="">{t("any")}</option>
        <option value="woman">{t("women")}</option>
        <option value="man">{t("men")}</option>
      </select>

      <AttrSelect
        label={t("country")}
        value={current.country ?? ""}
        options={attributes.countries}
        onChange={(v) => update({ country: v || undefined })}
      />
      <AttrSelect
        label={t("bodyType")}
        value={current.body_type ?? ""}
        options={attributes.bodyTypes}
        onChange={(v) => update({ body_type: v || undefined })}
      />
      <AttrSelect
        label={t("hairColor")}
        value={current.hair_color ?? ""}
        options={attributes.hairColors}
        onChange={(v) => update({ hair_color: v || undefined })}
      />
      <AttrSelect
        label={t("eyeColor")}
        value={current.eye_color ?? ""}
        options={attributes.eyeColors}
        onChange={(v) => update({ eye_color: v || undefined })}
      />
      <AttrSelect
        label={t("braSize")}
        value={current.bra_size ?? ""}
        options={attributes.braSizes}
        onChange={(v) => update({ bra_size: v || undefined })}
        disabled={!isWoman}
      />
      <AttrSelect
        label={t("boobsType")}
        value={current.boobs_type ?? ""}
        options={attributes.boobsTypes}
        onChange={(v) => update({ boobs_type: v || undefined })}
        disabled={!isWoman}
      />

      <RangeFilter
        label={t("height")}
        unit="см"
        bounds={HEIGHT}
        value={[num("height_min", HEIGHT.min), num("height_max", HEIGHT.max)]}
        onCommit={([min, max]) =>
          update({
            height_min: min > HEIGHT.min ? String(min) : undefined,
            height_max: max < HEIGHT.max ? String(max) : undefined,
          })
        }
      />
      <RangeFilter
        label={t("weight")}
        unit="кг"
        bounds={WEIGHT}
        value={[num("weight_min", WEIGHT.min), num("weight_max", WEIGHT.max)]}
        onCommit={([min, max]) =>
          update({
            weight_min: min > WEIGHT.min ? String(min) : undefined,
            weight_max: max < WEIGHT.max ? String(max) : undefined,
          })
        }
      />

      <select
        aria-label={t("sortPopular")}
        value={current.sort ?? "popular"}
        onChange={(e) => update({ sort: (e.target.value as ActorSort) || undefined })}
        className={selectClass}
      >
        <option value="popular">{t("sortPopular")}</option>
        <option value="name">{t("sortName")}</option>
        <option value="newest">{t("sortNewest")}</option>
      </select>

      <button
        type="button"
        onClick={() => router.push("/actors", { scroll: false })}
        className="text-link h-9 text-sm hover:underline"
      >
        {tCommon("reset")}
      </button>
    </div>
  );

  return (
    <>
      <div className="desktop:block hidden">{controls}</div>
      <div className="desktop:hidden">
        <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="md">
              <SlidersHorizontal size={16} />
              {tCommon("filters")}
            </Button>
          </DialogTrigger>
          <DialogContent side="bottom" className="gap-4 pt-10">
            <DialogTitle className="text-lg font-semibold">{tCommon("filters")}</DialogTitle>
            {controls}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
