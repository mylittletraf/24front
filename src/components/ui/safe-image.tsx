"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  /** Rendered when `src` is missing or the image fails to load (e.g. a 404 cover/poster). */
  fallback?: ReactNode;
};

/**
 * `next/image` that degrades to a placeholder instead of the browser's broken-image icon. Renders
 * `fallback` when there's no `src` or the image errors. The failed URL is tracked (not a boolean) so
 * the image retries automatically if `src` later changes to a different value.
 */
export function SafeImage({ src, alt, fallback = null, ...props }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <>{fallback}</>;

  return <Image {...props} src={src} alt={alt} onError={() => setFailedSrc(src)} />;
}
