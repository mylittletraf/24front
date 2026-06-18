"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { bffQuickLogin } from "@/lib/auth/bff-client";
import { useAuth } from "@/lib/auth/auth-context";

export function QuickLoginClient() {
  const t = useTranslations("quickLogin");
  const router = useRouter();
  const { setSession } = useAuth();
  const token = useSearchParams().get("token");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    bffQuickLogin(token)
      .then(({ access }) => setSession(access))
      .then(() => {
        if (!cancelled) router.replace("/");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, setSession, router]);

  return (
    <div className="text-muted grid flex-1 place-items-center py-24 text-center text-sm">
      {!token || failed ? <p>{t("failed")}</p> : <p>{t("loggingIn")}</p>}
    </div>
  );
}
