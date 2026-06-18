"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

/**
 * Hosts the auth modal. Phase 1 ships the open/close plumbing and a placeholder body;
 * Phase 5 replaces the body with real login/register forms.
 */
export function AuthUIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AuthView | null>(null);

  const value = useMemo<AuthUIContextValue>(
    () => ({
      open: (next: AuthView = "login") => setView(next),
      close: () => setView(null),
    }),
    [],
  );

  return (
    <AuthUIContext.Provider value={value}>
      {children}
      <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent side="center">
          <DialogTitle className="text-lg font-semibold">
            {view === "register" ? "Регистрация" : "Вход"}
          </DialogTitle>
          <p className="text-muted mt-4 text-sm">Скоро будет доступно.</p>
        </DialogContent>
      </Dialog>
    </AuthUIContext.Provider>
  );
}
