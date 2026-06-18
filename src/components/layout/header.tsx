"use client";

import { Bookmark, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Tag } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { MobileDrawer } from "./mobile-drawer";
import { ProfileMenu } from "./profile-menu";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [
    { href: "/videos", label: t("videos") },
    { href: "/actors", label: t("actors") },
    { href: "/collections", label: t("collections") },
  ];
  return (
    <>
      {items.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "border-b-2 px-1 py-1 text-sm font-medium transition-colors",
              active
                ? "border-accent text-foreground"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function Header({ categories }: { categories: Tag[] }) {
  const t = useTranslations("search");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="desktop:px-6 mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <Link href="/" className="text-accent shrink-0 text-xl font-bold">
          24front
        </Link>

        <nav className="desktop:flex hidden items-center gap-5">
          <NavLinks />
        </nav>

        <div className="desktop:block hidden max-w-[500px] flex-1">
          <SearchBox />
        </div>

        <div className="desktop:hidden flex-1" />

        <div className="desktop:flex hidden items-center gap-1">
          <Link
            href="/me?tab=favorites"
            aria-label={t("placeholder")}
            className="text-foreground hover:bg-surface grid h-9 w-9 place-items-center rounded-full"
          >
            <Bookmark size={20} />
          </Link>
          <ThemeToggle />
          <ProfileMenu />
        </div>

        <div className="desktop:hidden flex items-center gap-1">
          <Button
            variant="icon"
            size="icon"
            aria-label={t("placeholder")}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={22} />
          </Button>
          <MobileDrawer categories={categories} />
        </div>
      </div>

      {/* Mobile horizontal sub-nav */}
      <div className="border-border no-scrollbar desktop:hidden flex gap-4 overflow-x-auto border-t px-4 py-2">
        <NavLinks />
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent side="bottom" className="rounded-t-2xl pt-10" showClose>
          <DialogTitle className="sr-only">{t("placeholder")}</DialogTitle>
          <SearchBox autoFocus onNavigate={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
}
