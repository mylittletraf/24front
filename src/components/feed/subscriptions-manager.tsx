"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import {
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
  type FilterSubscription,
} from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

export function SubscriptionsManager() {
  const t = useTranslations("feed");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => {
      const token = getToken();
      return token ? listSubscriptions(token) : [];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  }

  async function patch(uuid: string, body: Partial<{ name: string; is_active: boolean }>) {
    const token = getToken();
    if (!token) return;
    try {
      await updateSubscription(token, uuid, body);
      invalidate();
    } catch (error) {
      toastApiError(error);
    }
  }

  async function remove(uuid: string) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteSubscription(token, uuid);
      toast.success(t("deleted"));
      invalidate();
    } catch (error) {
      toastApiError(error);
    }
  }

  if (isLoading) return null;
  const subs = data ?? [];
  if (subs.length === 0) return <EmptyState title={t("emptyNoSubsManage")} />;

  return (
    <ul className="flex flex-col gap-2">
      {subs.map((sub) => (
        <SubscriptionRow key={sub.uuid} sub={sub} onPatch={patch} onRemove={remove} />
      ))}
    </ul>
  );
}

function SubscriptionRow({
  sub,
  onPatch,
  onRemove,
}: {
  sub: FilterSubscription;
  onPatch: (uuid: string, body: Partial<{ name: string; is_active: boolean }>) => void;
  onRemove: (uuid: string) => void;
}) {
  const t = useTranslations("feed");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const [confirming, setConfirming] = useState(false);

  function commitName() {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== sub.name) onPatch(sub.uuid, { name: trimmed });
    else setName(sub.name);
  }

  return (
    <li className="border-border bg-surface/40 flex flex-wrap items-center gap-3 rounded-xl border p-3">
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(sub.name);
              setEditing(false);
            }
          }}
          className="border-border bg-background focus:border-accent flex-1 rounded-lg border px-2 py-1 text-sm outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={t("rename")}
          className={`flex-1 truncate text-left text-sm font-medium ${sub.is_active ? "" : "text-muted line-through"}`}
        >
          {sub.name}
        </button>
      )}

      <label className="text-muted flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={sub.is_active}
          onChange={(e) => onPatch(sub.uuid, { is_active: e.target.checked })}
        />
        {t("active")}
      </label>

      {confirming ? (
        <span className="flex items-center gap-1">
          <Button variant="danger" size="sm" onClick={() => onRemove(sub.uuid)}>
            {t("delete")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
        </span>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
          {t("delete")}
        </Button>
      )}
    </li>
  );
}
