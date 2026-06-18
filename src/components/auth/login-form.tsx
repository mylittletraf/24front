"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { bffLogin } from "@/lib/auth/bff-client";
import { useAuth } from "@/lib/auth/auth-context";
import { toastApiError } from "@/lib/toast-error";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
type Values = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-muted";

export function LoginForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: () => void;
  onSwitch: () => void;
}) {
  const t = useTranslations("auth");
  const { setSession } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    try {
      const { access } = await bffLogin(values.username, values.password);
      await setSession(access);
      onSuccess();
    } catch (error) {
      toastApiError(error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <input
        className={fieldClass}
        placeholder={t("username")}
        autoComplete="username"
        {...register("username")}
      />
      <input
        className={fieldClass}
        type="password"
        placeholder={t("password")}
        autoComplete="current-password"
        {...register("password")}
      />
      <Button variant="primary" type="submit" disabled={isSubmitting}>
        {t("login")}
      </Button>
      <button type="button" onClick={onSwitch} className="text-link text-sm hover:underline">
        {t("noAccount")}
      </button>
    </form>
  );
}
