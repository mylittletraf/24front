"use client";

import { Bookmark } from "lucide-react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { useFavorites } from "@/components/video/favorites-context";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";

/** Favorite toggle for video cards. Sits over the thumbnail (inside a Link) — stops the click. */
export function BookmarkButton({ uuid, className }: { uuid: string; className?: string }) {
  const { isAuthenticated } = useAuth();
  const { open: openAuth } = useAuthUI();
  const { isFavorite, toggleFavorite } = useFavorites();

  const favorited = isAuthenticated && isFavorite(uuid);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    toggleFavorite(uuid);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Save"
      aria-pressed={favorited}
      className={cn(
        "grid place-items-center rounded bg-black/80 p-1.5 text-white transition-colors hover:bg-black",
        className,
      )}
    >
      <Bookmark size={14} fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
