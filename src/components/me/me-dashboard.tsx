"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthUI } from "@/components/auth/auth-ui";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { clearHistory } from "@/lib/api/me-feeds";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { toastApiError } from "@/lib/toast-error";
import { MeReports } from "./me-reports";
import { MeVideoFeed } from "./me-video-feed";
import { ProfileSettings } from "./profile-settings";

const TABS = ["favorites", "liked", "history", "continue", "reports", "settings"] as const;
type Tab = (typeof TABS)[number];

const LABEL_KEYS: Record<Tab, string> = {
  favorites: "favorites",
  liked: "liked",
  history: "history",
  continue: "continueWatching",
  reports: "reports",
  settings: "settings",
};

function HistoryControls() {
  const t = useTranslations("profile");
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  async function clear() {
    const token = getToken();
    if (!token) return;
    try {
      await clearHistory(token);
      await queryClient.invalidateQueries({ queryKey: ["me-feed", "/me/history/"] });
      toast.success(t("history"));
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="flex justify-end">
      <Button variant="secondary" size="sm" onClick={clear}>
        {t("history")} ✕
      </Button>
    </div>
  );
}

export function MeDashboard({ initialTab }: { initialTab: Tab }) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const { status } = useAuth();
  const { open } = useAuthUI();
  const [tab, setTab] = useState<Tab>(initialTab);

  if (status === "loading") return null;

  if (status === "anonymous") {
    return (
      <EmptyState
        title={t("title")}
        action={
          <Button variant="primary" onClick={() => open("login")}>
            {tAuth("login")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="border-border no-scrollbar flex gap-1 overflow-x-auto border-b">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === value
                ? "border-accent text-foreground font-medium"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {t(LABEL_KEYS[value])}
          </button>
        ))}
      </div>

      {tab === "favorites" ? (
        <MeVideoFeed path="/me/favorites/" emptyTitle={t("favorites")} />
      ) : null}
      {tab === "liked" ? <MeVideoFeed path="/me/liked/" emptyTitle={t("liked")} /> : null}
      {tab === "history" ? (
        <div className="flex flex-col gap-3">
          <HistoryControls />
          <MeVideoFeed path="/me/history/" emptyTitle={t("history")} />
        </div>
      ) : null}
      {tab === "continue" ? (
        <MeVideoFeed path="/me/continue-watching/" emptyTitle={t("continueWatching")} />
      ) : null}
      {tab === "reports" ? <MeReports /> : null}
      {tab === "settings" ? <ProfileSettings /> : null}
    </div>
  );
}
