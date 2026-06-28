"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SHOW_SHORTS_COOKIE } from "@/lib/shorts-pref";

type ShortsPref = { show: boolean; toggle: () => void };

const ShortsPrefContext = createContext<ShortsPref>({ show: true, toggle: () => {} });

/**
 * Holds the "show Shorts" toggle for the whole app. Seeded from the server-read cookie so SSR and the
 * client agree (no flash), and persisted back on toggle. When off, interleaved/scoped Shorts shelves
 * and tiles are hidden across listing pages (the dedicated /shorts page stays reachable).
 */
export function ShortsPrefProvider({
  initialShow,
  children,
}: {
  initialShow: boolean;
  children: ReactNode;
}) {
  const [show, setShow] = useState(initialShow);

  function toggle() {
    setShow((prev) => {
      const next = !prev;
      document.cookie = `${SHOW_SHORTS_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <ShortsPrefContext.Provider value={{ show, toggle }}>{children}</ShortsPrefContext.Provider>
  );
}

export function useShortsPref() {
  return useContext(ShortsPrefContext);
}

/** Renders its children only while Shorts are enabled — for server-rendered shelves on entity pages. */
export function ShortsGate({ children }: { children: ReactNode }) {
  const { show } = useShortsPref();
  return show ? <>{children}</> : null;
}
