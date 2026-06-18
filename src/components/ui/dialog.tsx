"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

function Overlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in fixed inset-0 z-50 bg-black/60",
        className,
      )}
      {...props}
    />
  );
}

type ContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "center" | "right" | "bottom";
  showClose?: boolean;
};

const sideClasses: Record<NonNullable<ContentProps["side"]>, string> = {
  // Mobile: bottom sheet (consistent with search/filters). Desktop: centered card.
  center:
    "inset-x-0 bottom-0 max-h-[85%] w-full rounded-t-2xl desktop:inset-x-auto desktop:bottom-auto desktop:top-1/2 desktop:left-1/2 desktop:max-h-[85vh] desktop:w-[calc(100%-2rem)] desktop:max-w-md desktop:-translate-x-1/2 desktop:-translate-y-1/2 desktop:rounded-2xl",
  right: "right-0 top-0 h-full w-[85%] max-w-sm",
  bottom: "bottom-0 left-0 w-full max-h-[85%] rounded-t-2xl",
};

export function DialogContent({
  className,
  children,
  side = "center",
  showClose = true,
  ...props
}: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "border-border bg-background fixed z-50 flex flex-col overflow-y-auto border p-4 shadow-xl focus:outline-none",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close className="text-muted hover:bg-surface absolute top-3 right-3 rounded-full p-1">
            <X size={18} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
