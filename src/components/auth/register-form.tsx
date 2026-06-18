"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CopyField } from "@/components/common/copy-field";
import { Button } from "@/components/ui/button";
import { bffRegister } from "@/lib/auth/bff-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

const schema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  display_name: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-muted";

function quickLoginLink(token: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/quick-login?token=${token}`;
}

export function RegisterForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: () => void;
  onSwitch: () => void;
}) {
  const t = useTranslations("auth");
  const tq = useTranslations("quickLogin");
  const { setSession } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    try {
      const result = await bffRegister({
        username: values.username,
        password: values.password,
        email: values.email || undefined,
        display_name: values.display_name || undefined,
      });
      await setSession(result.access, result.user);
      setToken(result.quick_login_token);
    } catch (error) {
      toastApiError(error);
    }
  }

  if (token) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t("registerDone")}</p>
        <p className="text-muted text-sm">{tq("hint")}</p>
        <CopyField value={quickLoginLink(token)} />
        <p className="text-accent text-xs">{tq("dontShare")}</p>
        <Button variant="primary" onClick={onSuccess}>
          {t("done")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <input
        className={fieldClass}
        placeholder={t("username")}
        autoComplete="username"
        {...register("username")}
      />
      {errors.username ? <span className="text-accent text-xs">min 3</span> : null}
      <input
        className={fieldClass}
        type="password"
        placeholder={t("password")}
        autoComplete="new-password"
        {...register("password")}
      />
      {errors.password ? <span className="text-accent text-xs">min 6</span> : null}
      <input className={fieldClass} placeholder={t("email")} type="email" {...register("email")} />
      <input className={fieldClass} placeholder={t("displayName")} {...register("display_name")} />
      <Button variant="primary" type="submit" disabled={isSubmitting}>
        {t("register")}
      </Button>
      <button type="button" onClick={onSwitch} className="text-link text-sm hover:underline">
        {t("haveAccount")}
      </button>
    </form>
  );
}
