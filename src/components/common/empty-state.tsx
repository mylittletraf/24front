import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  description,
  icon,
  className,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="text-muted">{icon ?? <SearchX size={48} strokeWidth={1.5} />}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-muted max-w-md text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
