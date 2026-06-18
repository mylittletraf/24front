"use client";

import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { addFavorite, removeFavorite } from "@/lib/api/video-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { toastApiError } from "@/lib/toast-error";

/** Favorite toggle for video cards. Sits over the thumbnail (inside a Link) — stops the click. */
export function BookmarkButton({ uuid, className }: { uuid: string; className?: string }) {
  const { isAuthenticated, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    const token = getToken();
    if (!token || pending) return;
    const next = !favorited;
    setFavorited(next);
    setPending(true);
    try {
      if (next) await addFavorite(uuid, token);
      else await removeFavorite(uuid, token);
    } catch (error) {
      setFavorited(!next);
      toastApiError(error, { onUnauthorized: () => openAuth("login") });
    } finally {
      setPending(false);
    }
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
