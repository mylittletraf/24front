import { cn } from "@/lib/utils/cn";

/** Responsive video grid: 1 → 2 (≥640) → 3 (≥768) → 4 (≥1280) columns (UI_SPEC §5). */
export function VideoGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "wide:grid-cols-5 grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}
