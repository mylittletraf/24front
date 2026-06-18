"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Tag } from "@/lib/api/types";

/** Desktop-only sticky category grid (UI_SPEC §2.2): up to 35 + "All categories". */
export function CategoryGrid({ categories }: { categories: Tag[] }) {
  const t = useTranslations();
  const [open, setOpen] = useState(true);
  const items = categories.slice(0, 35);

  if (items.length === 0) return null;

  return (
    <div className="border-border bg-background desktop:block hidden border-b">
      <div className="mx-auto max-w-[1600px] px-6 py-2">
        <div className="flex items-start justify-between gap-4">
          {open ? (
            <ul className="grid flex-1 grid-cols-5 gap-x-4 gap-y-1">
              {items.map((cat) => (
                <li key={cat.uuid}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="hover:bg-surface flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    {cat.preview_image ? (
                      <Image
                        src={cat.preview_image}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="bg-surface-2 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs">
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate">{cat.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/categories"
                  className="text-link hover:bg-surface flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium"
                >
                  {t("nav.allCategories")} →
                </Link>
              </li>
            </ul>
          ) : (
            <span className="text-muted flex-1 py-1.5 text-sm">{t("nav.categories")}</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted hover:bg-surface flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-sm"
          >
            {open ? (
              <>
                <ChevronUp size={16} /> {t("common.hideCategories")}
              </>
            ) : (
              <>
                <ChevronDown size={16} /> {t("common.showCategories")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
