import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { JsonLd } from "./json-ld";

export interface Crumb {
  name: string;
  /** Site-relative path (e.g. `/category/foo`); the JSON-LD builder makes it absolute. */
  url: string;
}

/**
 * Visible breadcrumb trail + matching `BreadcrumbList` JSON-LD in one place. Improves crawl
 * depth and earns the breadcrumb rich result. The last crumb is the current page (plain text).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-muted text-sm">
      <JsonLd data={breadcrumbJsonLd(items)} />
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.url} className="flex min-w-0 items-center gap-1">
              {i > 0 ? (
                <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />
              ) : null}
              {last ? (
                <span aria-current="page" className="text-foreground truncate">
                  {it.name}
                </span>
              ) : (
                <Link href={it.url} className="hover:text-foreground transition-colors">
                  {it.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
