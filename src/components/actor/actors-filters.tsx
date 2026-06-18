"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ActorSort } from "@/lib/api/actors";

const selectClass =
  "h-9 rounded-full border border-border bg-surface px-3 text-sm outline-none focus:border-muted";

export function ActorsFilters({
  countries,
  current,
}: {
  countries: { slug: string; name: string }[];
  current: { gender?: string; country?: string; sort?: string };
}) {
  const t = useTranslations("actorsFilters");
  const tCommon = useTranslations("common");
  const router = useRouter();

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { ...current, ...patch };
    if (next.gender) params.set("gender", next.gender);
    if (next.country) params.set("country", next.country);
    if (next.sort) params.set("sort", next.sort);
    const qs = params.toString();
    router.push(qs ? `/actors?${qs}` : "/actors", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={current.gender ?? ""}
        onChange={(e) => update({ gender: e.target.value || undefined })}
        className={selectClass}
        aria-label={t("gender")}
      >
        <option value="">{t("any")}</option>
        <option value="woman">{t("women")}</option>
        <option value="man">{t("men")}</option>
      </select>

      <select
        value={current.country ?? ""}
        onChange={(e) => update({ country: e.target.value || undefined })}
        className={selectClass}
        aria-label={t("country")}
      >
        <option value="">{t("country")}</option>
        {countries.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={current.sort ?? "popular"}
        onChange={(e) => update({ sort: e.target.value as ActorSort })}
        className={selectClass}
        aria-label={t("sortPopular")}
      >
        <option value="popular">{t("sortPopular")}</option>
        <option value="name">{t("sortName")}</option>
        <option value="newest">{t("sortNewest")}</option>
      </select>

      <button
        type="button"
        onClick={() => router.push("/actors", { scroll: false })}
        className="text-link text-sm hover:underline"
      >
        {tCommon("reset")}
      </button>
    </div>
  );
}
