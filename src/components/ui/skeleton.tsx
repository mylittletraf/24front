import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}

/** Video card skeleton (16:9 thumb + two text lines). */
export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

/** Actor card skeleton (3:4 photo + name line). */
export function ActorCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
