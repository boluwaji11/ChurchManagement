"use client";
import * as React from "react";
import * as P from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn";

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof P.Root>,
  React.ComponentPropsWithoutRef<typeof P.Root>
>(({ className, ...props }, ref) => (
  <P.Root ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export const RadioItem = React.forwardRef<
  React.ComponentRef<typeof P.Item>,
  React.ComponentPropsWithoutRef<typeof P.Item> & { children?: React.ReactNode }
>(({ className, children, id, ...props }, ref) => (
  <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)] cursor-pointer">
    <P.Item
      ref={ref}
      id={id}
      className={cn(
        "size-5 shrink-0 rounded-full border border-line-strong bg-surface shadow-sm",
        "data-[state=checked]:border-primary data-[state=checked]:border-[6px]",
        "transition-[border-color,border-width] duration-instant ease-out",
        "disabled:opacity-45 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
    {children}
  </label>
));
RadioItem.displayName = "RadioItem";
