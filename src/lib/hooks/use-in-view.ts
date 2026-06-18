"use client";

import { useEffect, useRef, useState } from "react";

export function useInView<T extends Element>({
  rootMargin = "0px",
  threshold = 0,
  enabled = true,
  once = false,
}: {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
  once?: boolean;
} = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, enabled, once]);

  return { ref, inView };
}
