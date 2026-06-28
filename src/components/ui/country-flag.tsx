import { cn } from "@/lib/utils/cn";

/**
 * SVG country flag (via flag-icons) — renders identically on every platform, unlike flag emoji
 * which Windows doesn't ship. `code` is an ISO 3166-1 alpha-2 code (any case). Renders nothing
 * useful for unknown codes (the class just has no background), so callers should pass real codes.
 */
export function CountryFlag({ code, className }: { code: string; className?: string }) {
  return (
    <span aria-hidden className={cn(`fi fi-${code.toLowerCase()}`, "rounded-[2px]", className)} />
  );
}
