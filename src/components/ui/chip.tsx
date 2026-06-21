import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

export const chipVariants = cva(
  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors",
  {
    variants: {
      state: {
        default: "bg-surface text-foreground hover:bg-surface-2",
        active: "bg-accent text-on-accent hover:bg-accent-hover",
        exclude: "border border-accent bg-transparent text-accent",
      },
    },
    defaultVariants: { state: "default" },
  },
);

type ChipVariant = VariantProps<typeof chipVariants>;

export function Chip({
  className,
  state,
  href,
  ...props
}: ChipVariant & Omit<React.ComponentProps<"button">, "ref"> & { href?: string }) {
  if (href) {
    const { children } = props;
    return (
      <Link href={href} className={cn(chipVariants({ state }), className)}>
        {children}
      </Link>
    );
  }
  return <button type="button" className={cn(chipVariants({ state }), className)} {...props} />;
}
