"use client";

import { useTranslations } from "next-intl";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

export type AuthView = "login" | "register";

interface AuthUIContextValue {
  open: (view?: AuthView) => void;
  close: () => void;
}

const AuthUIContext = createContext<AuthUIContextValue | null>(null);

export function useAuthUI(): AuthUIContextValue {
  const ctx = useContext(AuthUIContext);
  if (!ctx) throw new Error("useAuthUI must be used within AuthUIProvider");
  return ctx;
}

export function AuthUIProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  const [view, setView] = useState<AuthView | null>(null);

  const value = useMemo<AuthUIContextValue>(
    () => ({
      open: (next: AuthView = "login") => setView(next),
      close: () => setView(null),
    }),
    [],
  );

  const close = () => setView(null);

  return (
    <AuthUIContext.Provider value={value}>
      {children}
      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent side="center" className="gap-4">
          <DialogTitle className="text-lg font-semibold">
            {view === "register" ? t("register") : t("login")}
          </DialogTitle>
          {view === "register" ? (
            <RegisterForm onSuccess={close} onSwitch={() => setView("login")} />
          ) : (
            <LoginForm onSuccess={close} onSwitch={() => setView("register")} />
          )}
        </DialogContent>
      </Dialog>
    </AuthUIContext.Provider>
  );
}
