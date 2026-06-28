"use client";

import { Bookmark, History, LogOut, Menu, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { ShortsToggle } from "@/components/shorts/shorts-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";

export function MobileDrawer() {
  const t = useTranslations();
  const { open: openAuth } = useAuthUI();
  const { isAuthenticated, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Primary navigation (the whole nav lives in the hamburger on mobile).
  const navLinks = [
    { href: "/", label: t("nav.videos") },
    { href: "/shorts", label: t("nav.shorts") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/actors", label: t("nav.actors") },
    { href: "/studios", label: t("nav.studios") },
    { href: "/collections", label: t("nav.collections") },
    { href: "/feed", label: t("nav.feed") },
  ];

  const accountLinks = [
    { href: "/me?tab=settings", label: t("profile.title"), icon: User },
    { href: "/me?tab=favorites", label: t("profile.favorites"), icon: Star },
    { href: "/me?tab=history", label: t("profile.history"), icon: History },
    { href: "/me?tab=liked", label: t("profile.liked"), icon: Bookmark },
  ];

  const displayName = user?.display_name || user?.username || "";

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
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pr-9">
              <span className="bg-accent grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-sm font-medium">{displayName}</span>
              <ShortsToggle />
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center gap-2 pr-9">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 rounded-lg"
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
                className="flex-1 rounded-lg"
                onClick={() => {
                  setOpen(false);
                  openAuth("register");
                }}
              >
                {t("auth.register")}
              </Button>
              <ShortsToggle />
              <ThemeToggle />
            </div>
          )}
        </div>

        <nav className="flex flex-col">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="hover:bg-surface rounded-md px-2 py-3 text-center text-lg font-semibold"
            >
              {label}
            </Link>
          ))}
        </nav>

        {isAuthenticated ? (
          <nav className="border-border flex flex-col border-t pt-3">
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
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="hover:bg-surface flex items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm"
            >
              <LogOut size={18} className="text-muted" />
              {t("auth.logout")}
            </button>
          </nav>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
