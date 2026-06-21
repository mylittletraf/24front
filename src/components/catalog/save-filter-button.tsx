"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellPlus, BellRing, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/errors";
import {
  createSubscription,
  deleteSubscription,
  type FilterSubscription,
  filtersToSubscriptionFields,
  listSubscriptions,
  subscriptionToFilters,
} from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v) => b.includes(v));

/** The user's subscription whose filter equals the given one (so the button shows "subscribed"). */
function matchSubscription(
  subs: FilterSubscription[],
  f: VideoFilters,
): FilterSubscription | undefined {
  return subs.find((sub) => {
    const sf = subscriptionToFilters(sub);
    return (
      sameSet(sf.categories, f.categories) &&
      sameSet(sf.include_tags, f.include_tags) &&
      sameSet(sf.exclude_tags, f.exclude_tags) &&
      sameSet(sf.actors, f.actors) &&
      (sf.q ?? "") === (f.q ?? "") &&
      (sf.duration_min ?? null) === (f.duration_min ?? null) &&
      (sf.duration_max ?? null) === (f.duration_max ?? null) &&
      ACTOR_ATTR_KEYS.every((k) => (sf[k] ?? "") === (f[k] ?? ""))
    );
  });
}

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

  const { data: subs = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => {
      const token = getToken();
      return token ? listSubscriptions(token) : [];
    },
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
  const subscribed = matchSubscription(subs, filters);

  function start() {
    if (status !== "authenticated") {
      openAuth("login");
      return;
    }
    setName(buildName(filters, labels));
    setOpen(true);
  }

  async function unsubscribe() {
    const token = getToken();
    if (!token || !subscribed) return;
    setSaving(true);
    try {
      await deleteSubscription(token, subscribed.uuid);
      toast.success(t("deleted"));
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (error) {
      toastApiError(error);
    } finally {
      setSaving(false);
    }
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
      <Button
        variant={subscribed ? "primary" : "secondary"}
        size="sm"
        onClick={subscribed ? unsubscribe : start}
        disabled={saving}
      >
        {subscribed ? <BellRing size={16} /> : <BellPlus size={16} />}
        {subscribed ? t("subscribed") : t("subscribe")}
        {count && count > 0 ? (
          <span
            className={cn(
              "ml-1 inline-flex items-center gap-1 border-l pl-2",
              subscribed ? "border-white/30 text-white/90" : "text-muted border-border",
            )}
          >
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
