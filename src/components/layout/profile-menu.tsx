"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";

export function ProfileMenu() {
  const t = useTranslations();
  const { open } = useAuthUI();
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => open("login")}>
          {t("auth.login")}
        </Button>
        <Button variant="primary" size="sm" className="rounded-lg" onClick={() => open("register")}>
          {t("auth.register")}
        </Button>
      </div>
    );
  }

  const name = user?.display_name || user?.username || "?";
  const initial = name.charAt(0).toUpperCase();

  const links = [
    { href: "/me?tab=settings", label: t("profile.title") },
    { href: "/me?tab=favorites", label: t("profile.favorites") },
    { href: "/me?tab=history", label: t("profile.history") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name}
          className="bg-accent grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href}>{link.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => logout()}>{t("auth.logout")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
