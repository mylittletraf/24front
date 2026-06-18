"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CopyField } from "@/components/common/copy-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccount, requestQuickLoginLink, updateDisplayName } from "@/lib/api/me";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

function quickLoginLink(token: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/quick-login?token=${token}`;
}

export function ProfileSettings() {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tq = useTranslations("quickLogin");
  const router = useRouter();
  const { user, getToken, setSession, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);

  async function saveName() {
    const token = getToken();
    if (!token) return;
    setSavingName(true);
    try {
      const updated = await updateDisplayName(displayName.trim(), token);
      await setSession(token, updated);
      toast.success(t("settings"));
    } catch (error) {
      toastApiError(error);
    } finally {
      setSavingName(false);
    }
  }

  async function getLink() {
    const token = getToken();
    if (!token) return;
    setLoadingLink(true);
    try {
      const newToken = await requestQuickLoginLink(token);
      setLinkToken(newToken);
    } catch (error) {
      toastApiError(error);
    } finally {
      setLoadingLink(false);
    }
  }

  async function confirmDelete() {
    const token = getToken();
    if (!token) return;
    try {
      await deleteAccount(token);
      await logout();
      router.replace("/");
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">{tAuth("displayName")}</label>
        <div className="flex gap-2">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-border bg-surface focus:border-muted h-10 flex-1 rounded-lg border px-3 text-sm outline-none"
          />
          <Button variant="primary" onClick={saveName} disabled={savingName}>
            {tAuth("done")}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{tq("title")}</h2>
        <p className="text-muted text-sm">{tq("hint")}</p>
        {linkToken ? <CopyField value={quickLoginLink(linkToken)} /> : null}
        <div>
          <Button variant="secondary" onClick={getLink} disabled={loadingLink}>
            {linkToken ? tq("refresh") : tq("get")}
          </Button>
        </div>
        <p className="text-accent text-xs">{tq("dontShare")}</p>
      </section>

      <section>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="danger">{t("deleteAccount")}</Button>
          </DialogTrigger>
          <DialogContent side="center" className="gap-4">
            <DialogTitle className="text-lg font-semibold">{t("deleteAccount")}</DialogTitle>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">✕</Button>
              </DialogClose>
              <Button variant="danger" onClick={confirmDelete}>
                {t("deleteAccount")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
