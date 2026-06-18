"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocaleCookie } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils/cn";

/**
 * Content language switcher driven by the SEO `alternates` map (lang -> absolute URL).
 * Switching sets the UI locale cookie and navigates to the localized slug with ?lang.
 */
export function LanguageSwitcher({
  alternates,
  current,
  fallbackLanguage,
}: {
  alternates: Record<string, string>;
  current: string;
  fallbackLanguage?: string | null;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const langs = Object.keys(alternates);

  if (langs.length <= 1 && !fallbackLanguage) return null;

  function switchTo(lang: string) {
    setLocaleCookie(lang);
    try {
      const url = new URL(alternates[lang]);
      router.replace(`${url.pathname}?lang=${lang}`);
    } catch {
      router.replace(`?lang=${lang}`);
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {fallbackLanguage ? (
        <span className="bg-surface-2 text-muted rounded-full px-2 py-1 text-xs">
          {t("otherLanguage")}
        </span>
      ) : null}
      {langs.length > 1 ? (
        <div className="text-muted flex items-center gap-1 text-sm">
          <Languages size={16} />
          {langs.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => switchTo(lang)}
              className={cn(
                "rounded px-1.5 py-0.5 uppercase",
                lang === current ? "text-foreground font-semibold" : "hover:text-foreground",
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
