import { cn } from "@/lib/utils/cn";

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("desktop:px-6 w-full px-4", className)} {...props} />;
}
