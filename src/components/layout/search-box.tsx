"use client";

import { Clapperboard, Folder, Search, Tag as TagIcon, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import { getSuggestions, suggestionHref, type Suggestion } from "@/lib/api/search";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  tag: TagIcon,
  category: Folder,
  studio: Clapperboard,
  actor: User,
} as const;

export function SearchBox({
  className,
  autoFocus = false,
  onNavigate,
  large = false,
}: {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  /** Taller field + prominent accent search button (used in the mobile search panel). */
  large?: boolean;
}) {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounced = useDebouncedValue(value, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // getSuggestions resolves to [] for queries shorter than 2 chars, so the
    // state update always happens asynchronously (no setState-in-effect).
    const controller = new AbortController();
    getSuggestions(debounced, locale, controller.signal)
      .then((items) => setSuggestions(items.slice(0, 8)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [debounced, locale]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    track("search", { query: q });
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function pick(s: Suggestion) {
    setOpen(false);
    onNavigate?.();
    router.push(suggestionHref(s));
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={submit} className="relative flex items-center">
        <input
          // Browser extensions (form fillers) inject attributes like wfd-id before
          // hydration; ignore those attribute mismatches on this input.
          suppressHydrationWarning
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("placeholder")}
          className={cn(
            "border-border bg-surface focus:border-muted w-full rounded-full border outline-none",
            large ? "h-12 px-5 pr-24 text-base" : "h-10 px-4 pr-20 text-sm",
          )}
        />
        {value ? (
          <button
            type="button"
            aria-label={t("clear")}
            onClick={() => {
              setValue("");
              setSuggestions([]);
            }}
            className={cn(
              "text-muted hover:bg-surface-2 absolute grid place-items-center rounded-full",
              large ? "right-12 h-9 w-9" : "right-10 h-7 w-7",
            )}
          >
            <X size={large ? 18 : 16} />
          </button>
        ) : null}
        <button
          type="submit"
          aria-label={t("placeholder")}
          className={cn(
            "absolute grid place-items-center rounded-full",
            large
              ? "bg-accent hover:bg-accent-hover right-1.5 h-9 w-9 text-white"
              : "text-muted hover:bg-surface-2 right-1 h-8 w-8",
          )}
        >
          <Search size={large ? 20 : 18} />
        </button>
      </form>

      {open && suggestions.length > 0 ? (
        <ul className="border-border bg-background absolute top-12 z-50 w-full overflow-hidden rounded-xl border py-1 shadow-xl">
          {suggestions.map((s) => {
            const Icon = ICONS[s.type];
            return (
              <li key={`${s.type}-${s.slug}`}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="hover:bg-surface flex w-full items-center gap-3 px-4 py-2 text-left text-sm"
                >
                  <Icon size={16} className="text-muted" />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
