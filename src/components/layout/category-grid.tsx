"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SafeImage } from "@/components/ui/safe-image";
import type { Tag } from "@/lib/api/types";
import { formatCount } from "@/lib/utils/format";
import { useCategoriesDisclosure } from "./categories-disclosure";

/** Desktop-only category panel, shown when the header "Категории" arrow is toggled. */
export function CategoryGrid({ categories }: { categories: Tag[] }) {
  const t = useTranslations();
  const { open, setOpen } = useCategoriesDisclosure();
  const items = categories.slice(0, 35);

  if (!open || items.length === 0) return null;

  return (
    <div className="border-border bg-background desktop:block hidden border-b">
      <div className="w-full px-6 py-3">
        <div className="wide:grid-cols-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
          {items.map((cat) => (
            <Link
              key={cat.uuid}
              href={`/category/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
            >
              <SafeImage
                src={cat.preview_image}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
                fallback={
                  <span className="bg-surface-2 text-muted grid h-11 w-11 shrink-0 place-items-center rounded-lg text-base font-semibold">
                    {cat.name.charAt(0).toUpperCase()}
                  </span>
                }
              />
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
            onClick={() => setOpen(false)}
            className="border-border text-link hover:bg-surface flex items-center justify-center gap-1 rounded-xl border border-dashed p-2.5 text-sm font-medium"
          >
            {t("nav.allCategories")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
