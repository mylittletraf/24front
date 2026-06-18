"use client";

import { Bookmark, History, Menu, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Tag } from "@/lib/api/types";

export function MobileDrawer({ categories }: { categories: Tag[] }) {
  const t = useTranslations();
  const { open: openAuth } = useAuthUI();
  const [open, setOpen] = useState(false);

  const accountLinks = [
    { href: "/me", label: t("profile.title"), icon: User },
    { href: "/me/favorites", label: t("profile.favorites"), icon: Star },
    { href: "/me/history", label: t("profile.history"), icon: History },
    { href: "/me/favorites", label: t("nav.collections"), icon: Bookmark },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="icon" size="icon" aria-label="Menu">
          <Menu size={22} />
        </Button>
      </DialogTrigger>
      <DialogContent side="right" className="gap-4">
        <DialogTitle className="sr-only">Menu</DialogTitle>

        <div className="border-border flex flex-col gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                openAuth("login");
              }}
            >
              {t("auth.login")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                openAuth("register");
              }}
            >
              {t("auth.register")}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex flex-col">
          {accountLinks.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={`${href}-${i}`}
              href={href}
              onClick={() => setOpen(false)}
              className="hover:bg-surface flex items-center gap-3 rounded-md px-2 py-2.5 text-sm"
            >
              <Icon size={18} className="text-muted" />
              {label}
            </Link>
          ))}
        </nav>

        {categories.length > 0 ? (
          <div className="border-border flex min-h-0 flex-1 flex-col border-t pt-3">
            <h3 className="px-2 pb-1 text-sm font-semibold">{t("nav.categories")}</h3>
            <ul className="flex-1 overflow-y-auto">
              {categories.map((cat) => (
                <li key={cat.uuid}>
                  <Link
                    href={`/category/${cat.slug}`}
                    onClick={() => setOpen(false)}
                    className="hover:bg-surface block truncate rounded-md px-2 py-2 text-sm"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/categories"
              onClick={() => setOpen(false)}
              className="text-link px-2 py-2 text-sm font-medium"
            >
              {t("nav.allCategories")} →
            </Link>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
