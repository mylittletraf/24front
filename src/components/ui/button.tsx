import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition focus-visible:ring-accent/50 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rounded-full bg-accent text-on-accent hover:bg-accent-hover hover:shadow-[0_8px_24px_-8px_rgb(255_106_43_/0.5)]",
        secondary: "rounded-full border border-border text-foreground hover:bg-surface",
        ghost: "rounded-full text-foreground hover:bg-surface",
        icon: "rounded-full text-foreground hover:bg-surface",
        danger:
          "rounded-full border border-accent text-accent hover:bg-accent hover:text-on-accent",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});
