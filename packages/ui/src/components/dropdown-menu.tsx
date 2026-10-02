"use client";
import * as React from "react";
import * as P from "@radix-ui/react-dropdown-menu";
import { cn } from "../lib/cn";

/**
 * A menu of the things that can be done to one row.
 *
 * A row with six ghost buttons on it gives equal weight to the thing a church
 * does every week and the thing it does once a year. The primary action stays
 * on the row and the rest come in here, which also gets a long row off the
 * right edge of a phone.
 *
 * The trigger carries a name. An icon-only button is refused by the design
 * system, so the caller labels it.
 */
export const DropdownMenu = P.Root;
export const DropdownMenuTrigger = P.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content>
>(({ className, align = "end", sideOffset = 6, ...props }, ref) => (
  <P.Portal>
    <P.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg p-1",
        "data-[state=open]:animate-[hearth-rise_var(--duration-fast)_var(--ease-out)]",
        className,
      )}
      {...props}
    />
  </P.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof P.Item>,
  React.ComponentPropsWithoutRef<typeof P.Item> & { tone?: "default" | "danger" }
>(({ className, tone = "default", ...props }, ref) => (
  <P.Item
    ref={ref}
    className={cn(
      "flex w-full cursor-pointer select-none items-center gap-2 rounded-md text-left",
      "min-h-[var(--d-tap)] px-2 text-[length:var(--d-text-body)] outline-none",
      "data-[highlighted]:bg-sunken",
      "data-[disabled]:opacity-45 data-[disabled]:pointer-events-none",
      "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-70",
      tone === "danger" && "text-danger-text [&_svg]:opacity-100",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof P.Separator>,
  React.ComponentPropsWithoutRef<typeof P.Separator>
>(({ className, ...props }, ref) => (
  <P.Separator ref={ref} className={cn("my-1 h-px bg-line", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
