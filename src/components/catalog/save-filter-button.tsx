"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BellPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/errors";
import { createSubscription, filtersToSubscriptionFields } from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { toastApiError } from "@/lib/toast-error";
import { formatCount } from "@/lib/utils/format";

/** Build a human-readable default name from the active filters' localized labels. */
function buildName(filters: VideoFilters, labels: Record<string, string>): string {
  const name = (slug: string) => labels[slug] ?? slug;
  const parts: string[] = [
    ...filters.categories.map(name),
    ...filters.include_tags.map((s) => `#${name(s)}`),
    ...filters.actors.map(name),
    ...ACTOR_ATTR_KEYS.map((k) => filters[k])
      .filter(Boolean)
      .map((v) => name(v as string)),
  ];
  if (filters.q) parts.push(`“${filters.q}”`);
  return parts.join(" + ");
}

export function SaveFilterButton({
  filters,
  labels = {},
  count,
}: {
  filters: VideoFilters;
  labels?: Record<string, string>;
  /** Subscriber count shown inside the button (omitted when 0/undefined). */
  count?: number;
}) {
  const t = useTranslations("feed");
  const { status, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function start() {
    if (status !== "authenticated") {
      openAuth("login");
      return;
    }
    setName(buildName(filters, labels));
    setOpen(true);
  }

  async function save() {
    const token = getToken();
    const trimmed = name.trim();
    if (!token || !trimmed) return;
    setSaving(true);
    try {
      await createSubscription(token, { name: trimmed, ...filtersToSubscriptionFields(filters) });
      toast.success(t("created"));
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) toast.error(t("limitReached"));
      else toastApiError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={start}>
        <BellPlus size={16} />
        {t("subscribe")}
        {count && count > 0 ? (
          <span className="text-muted border-border ml-1 inline-flex items-center gap-1 border-l pl-2">
            <Users size={14} />
            {formatCount(count)}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="center" className="gap-4">
          <DialogTitle className="text-lg font-semibold">{t("subscribe")}</DialogTitle>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t("nameLabel")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="border-border bg-background focus:border-accent rounded-lg border px-3 py-2 text-sm outline-none"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || !name.trim()}>
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
