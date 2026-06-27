"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CommentsSection } from "@/components/video/comments";
import { useMediaQuery, useMounted } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils/cn";

/**
 * Comments for a short. Desktop → a full-height right-side drawer (like the mobile menu/filters);
 * mobile → a ~half-screen bottom sheet with the form + thread. Reuses the catalog CommentsSection.
 */
export function ShortComments({
  uuid,
  commentsCount,
  open,
  onOpenChange,
}: {
  uuid: string;
  commentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("video");
  const isWide = useMediaQuery("(min-width: 1024px)");
  const desktop = useMounted() && isWide;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side={desktop ? "right" : "bottom"}
        className={cn(desktop ? "w-[420px] max-w-[420px]" : "h-[60vh] max-h-[60vh]")}
      >
        <DialogTitle className="sr-only">{t("comments")}</DialogTitle>
        <CommentsSection videoUuid={uuid} commentsCount={commentsCount} />
      </DialogContent>
    </Dialog>
  );
}
