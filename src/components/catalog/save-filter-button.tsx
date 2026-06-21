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
  filtersToSubscriptionFields,
  getSubscriptionsState,
  type SubscriptionEntity,
  type SubscriptionEntityState,
  type SubscriptionInput,
  subscriptionKey,
} from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { ACTOR_ATTR_KEYS, type VideoFilters } from "@/lib/filters";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";

/** Build a human-readable default name from the active filters' localized labels. */
function buildName(filters: VideoFilters, labels: Record<string, string>): string {
  const name = (slug: string) => labels[slug] ?? slug;
  const parts: string[] = [
    ...filters.categories.map(name),
    ...filters.studios.map(name),
    ...filters.include_tags.map((s) => `#${name(s)}`),
    ...filters.actors.map(name),
    ...ACTOR_ATTR_KEYS.map((k) => filters[k])
      .filter(Boolean)
      .map((v) => name(v as string)),
  ];
  if (filters.q) parts.push(`“${filters.q}”`);
  return parts.join(" + ");
}

/** Single-base subscription fields for an entity (category/tag/studio/actor). */
function entityFields(entity: SubscriptionEntity): SubscriptionInput {
  switch (entity.type) {
    case "category":
      return { categories: entity.slug };
    case "tag":
      return { include_tags: entity.slug };
    case "studio":
      return { studios: entity.slug };
    case "actor":
      return { actors: entity.slug };
  }
}

export function SaveFilterButton({
  filters,
  labels = {},
  count,
  entity,
  entityName,
}: {
  filters: VideoFilters;
  labels?: Record<string, string>;
  /** Subscriber count shown inside the button (omitted when 0/undefined). */
  count?: number;
  /** When set, the button follows a single entity: live status + instant toggle (no dialog). */
  entity?: SubscriptionEntity;
  /** Default subscription name when following `entity`. */
  entityName?: string;
}) {
  const t = useTranslations("feed");
  const { status, getToken } = useAuth();
  const { open: openAuth } = useAuthUI();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Entity mode: subscription status comes from the batched /me/subscriptions/state/ endpoint.
  const { data: stateMap } = useQuery({
    queryKey: ["subscription-state", entity?.type, entity?.slug],
    queryFn: (): Promise<Record<string, SubscriptionEntityState>> => {
      const token = getToken();
      return token && entity ? getSubscriptionsState([entity], token) : Promise.resolve({});
    },
    enabled: status === "authenticated" && !!entity,
    staleTime: 30_000,
  });
  const state = entity ? stateMap?.[subscriptionKey(entity)] : undefined;
  const subscribed = Boolean(state?.subscribed);

  function invalidate() {
    if (entity)
      void queryClient.invalidateQueries({
        queryKey: ["subscription-state", entity.type, entity.slug],
      });
    void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  }

  /** Entity follow/unfollow — instant, no naming dialog. */
  async function toggleEntity() {
    if (status !== "authenticated") {
      openAuth("login");
      return;
    }
    const token = getToken();
    if (!token || !entity) return;
    setSaving(true);
    try {
      if (subscribed && state?.subscription_uuid) {
        await deleteSubscription(token, state.subscription_uuid);
        toast.success(t("deleted"));
      } else {
        await createSubscription(token, {
          name: entityName || entity.slug,
          ...entityFields(entity),
        });
        toast.success(t("created"));
      }
      invalidate();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) toast.error(t("limitReached"));
      else toastApiError(error);
    } finally {
      setSaving(false);
    }
  }

  /** Custom-filter flow — open the naming dialog. */
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
      invalidate();
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
        onClick={entity ? toggleEntity : start}
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
