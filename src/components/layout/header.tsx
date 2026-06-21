"use client";

import { Bookmark, ChevronDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFeedUnread } from "@/components/feed/feed-unread-context";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { SITE_NAME } from "@/lib/api/config";
import { cn } from "@/lib/utils/cn";
import { useCategoriesDisclosure } from "./categories-disclosure";
import { MobileDrawer } from "./mobile-drawer";
import { ProfileMenu } from "./profile-menu";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

function navLinkClass(active: boolean) {
  return cn(
    "border-b-2 px-1 py-1 text-sm font-medium transition-colors",
    active
      ? "border-accent text-foreground"
      : "text-muted hover:text-foreground border-transparent",
  );
}

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link href={href} onClick={onNavigate} className={navLinkClass(active)}>
      {label}
    </Link>
  );
}

/** Desktop "Категории" — text links to /categories, the arrow toggles the on-page panel. */
function CategoriesNavItem() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { open, toggle } = useCategoriesDisclosure();
  const active = pathname.startsWith("/categories") || pathname.startsWith("/category");
  return (
    <span className="flex items-center gap-1.5">
      <Link href="/categories" className={navLinkClass(active)}>
        {t("categories")}
      </Link>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t("categories")}
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full border transition-colors",
          open
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-muted hover:bg-surface hover:text-foreground",
        )}
      >
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
    </span>
  );
}

/** "Лента" with an unseen-count badge. */
function FeedNavLink({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { count } = useFeedUnread();
  const active = pathname.startsWith("/feed");
  return (
    <Link
      href="/feed"
      onClick={() => {
        track("feed_open");
        onNavigate?.();
      }}
      className={cn(navLinkClass(active), "inline-flex items-center gap-1.5")}
    >
      {t("feed")}
      {count > 0 ? (
        <span className="bg-accent grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function Header() {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="desktop:px-6 flex h-14 w-full items-center gap-4 px-4">
        <Link href="/" className="text-accent shrink-0 text-xl font-bold">
          {SITE_NAME}
        </Link>

        <nav className="desktop:flex hidden items-center gap-5">
          <NavLink href="/" label={tNav("videos")} />
          <CategoriesNavItem />
          <NavLink href="/actors" label={tNav("actors")} />
          <NavLink href="/studios" label={tNav("studios")} />
          <NavLink href="/collections" label={tNav("collections")} />
          <FeedNavLink />
        </nav>

        <div className="desktop:flex hidden flex-1 justify-center">
          <div className="w-full max-w-[520px]">
            <SearchBox />
          </div>
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
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
          >
            {searchOpen ? <X size={22} /> : <Search size={22} />}
          </Button>
          <MobileDrawer />
        </div>
      </div>

      {/* Mobile search: a panel that drops down under the header (like the desktop category panel). */}
      {searchOpen ? (
        <div className="border-border desktop:hidden border-t p-3">
          <SearchBox large autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      ) : null}
    </header>
  );
}
