"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides its children on the full-screen /shorts routes. Uses `usePathname` (not the root layout's
 * x-pathname) because the root layout isn't re-rendered on client-side navigation — this
 * re-evaluates on every route change, so the footer comes back when you leave /shorts.
 */
export function HideOnShorts({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/shorts")) return null;
  return <>{children}</>;
}
