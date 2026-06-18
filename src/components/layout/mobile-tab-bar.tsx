"use client";

import { BookOpen, Clapperboard, Home, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/videos", label: t("videos"), icon: Clapperboard },
    { href: "/actors", label: t("actors"), icon: Users },
    { href: "/collections", label: t("collections"), icon: BookOpen },
  ];

  return (
    <nav className="border-border bg-background desktop:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-accent" : "text-muted",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
