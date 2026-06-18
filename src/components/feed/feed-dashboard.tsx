"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuthUI } from "@/components/auth/auth-ui";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { markFeedSeen } from "@/lib/api/filter-subscriptions";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";
import { useFeedUnread } from "./feed-unread-context";
import { FeedList } from "./feed-list";
import { SubscriptionsManager } from "./subscriptions-manager";

type Tab = "feed" | "subs";

export function FeedDashboard() {
  const t = useTranslations("feed");
  const tAuth = useTranslations("auth");
  const { status, getToken } = useAuth();
  const { open } = useAuthUI();
  const { clear } = useFeedUnread();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("feed");
  const seenRef = useRef(false);

  // Mark the feed as seen on first visit → reset the nav badge.
  useEffect(() => {
    if (status !== "authenticated" || seenRef.current) return;
    const token = getToken();
    if (!token) return;
    seenRef.current = true;
    void markFeedSeen(token).then(() => {
      clear();
      void queryClient.invalidateQueries({ queryKey: ["feed-unread"] });
    });
  }, [status, getToken, clear, queryClient]);

  if (status === "loading") return null;

  if (status === "anonymous") {
    return (
      <EmptyState
        title={t("loginToSee")}
        action={
          <Button variant="primary" onClick={() => open("login")}>
            {tAuth("login")}
          </Button>
        }
      />
    );
  }

  const tabs: [Tab, string][] = [
    ["feed", t("tabFeed")],
    ["subs", t("tabSubscriptions")],
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <div className="border-border flex gap-1 border-b">
        {tabs.map(([value, label]) => (
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
            {label}
          </button>
        ))}
      </div>

      {tab === "feed" ? <FeedList /> : <SubscriptionsManager />}
    </div>
  );
}
