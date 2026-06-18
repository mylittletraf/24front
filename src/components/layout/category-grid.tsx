"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Tag } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";

/** Desktop-only category strip: collapsed by default, expands into informative cards. */
export function CategoryGrid({ categories }: { categories: Tag[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const items = categories.slice(0, 35);

  if (items.length === 0) return null;

  return (
    <div className="border-border bg-background desktop:block hidden border-b">
      <div className="w-full px-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 py-2.5 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <LayoutGrid size={18} className="text-accent" />
            {t("nav.categories")}
            <span className="text-muted">({items.length})</span>
          </span>
          <ChevronDown
            size={18}
            className={cn("text-muted transition-transform", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="wide:grid-cols-6 grid grid-cols-2 gap-2.5 pb-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((cat) => (
              <Link
                key={cat.uuid}
                href={`/category/${cat.slug}`}
                className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
              >
                {cat.preview_image ? (
                  <Image
                    src={cat.preview_image}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="bg-surface-2 text-muted grid h-11 w-11 shrink-0 place-items-center rounded-lg text-base font-semibold">
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{cat.name}</span>
                  <span className="text-muted block text-xs">
                    {t("categoriesPage.videosCount", { count: formatCount(cat.videos_count) })}
                  </span>
                </span>
              </Link>
            ))}
            <Link
              href="/categories"
              className="border-border text-link hover:bg-surface flex items-center justify-center gap-1 rounded-xl border border-dashed p-2.5 text-sm font-medium"
            >
              {t("nav.allCategories")} →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
