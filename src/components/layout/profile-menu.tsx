"use client";

import { useTranslations } from "next-intl";
import { useAuthUI } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";

/**
 * Header auth area. Phase 1: anonymous-only (login/register buttons).
 * Phase 5 adds the authenticated avatar dropdown.
 */
export function ProfileMenu() {
  const t = useTranslations("auth");
  const { open } = useAuthUI();

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => open("login")}>
        {t("login")}
      </Button>
      <Button variant="primary" size="sm" onClick={() => open("register")}>
        {t("register")}
      </Button>
    </div>
  );
}
