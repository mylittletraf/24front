"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface CategoriesDisclosureValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CategoriesDisclosureContext = createContext<CategoriesDisclosureValue | null>(null);

export function useCategoriesDisclosure(): CategoriesDisclosureValue {
  const ctx = useContext(CategoriesDisclosureContext);
  if (!ctx)
    throw new Error("useCategoriesDisclosure must be used within CategoriesDisclosureProvider");
  return ctx;
}

/** Shares the desktop category-panel open state between the header nav arrow and the panel. */
export function CategoriesDisclosureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo<CategoriesDisclosureValue>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v) }),
    [open],
  );
  return (
    <CategoriesDisclosureContext.Provider value={value}>
      {children}
    </CategoriesDisclosureContext.Provider>
  );
}
