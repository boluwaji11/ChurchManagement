"use client";
import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "../lib/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

/**
 * A panel of controls hung off the control that opened it.
 *
 * For settings that belong to a toolbar button: the filters on a list, the
 * fields a report shows. It keeps the page underneath visible and usable, which
 * is the whole difference between this and a Dialog. A question that has to be
 * answered before anything else happens is a Dialog; a tray of controls that
 * can be left open while the reader looks at what changed is this.
 *
 * Nothing is stacked on anything, so a popover that would open a dialog is a
 * flow to rewrite rather than a prop to add.
 */
export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content> & { title?: string }
>(({ className, align = "start", sideOffset = 6, title, children, ...props }, ref) => (
  <P.Portal>
    <P.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        "z-50 flex max-h-[min(62vh,440px)] w-[min(92vw,420px)] flex-col gap-3 overflow-y-auto",
        "rounded-[14px] border border-line bg-surface p-4 shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      {title ? <h3 className="text-[15px] font-bold text-fg">{title}</h3> : null}
      {children}
    </P.Content>
  </P.Portal>
));
PopoverContent.displayName = "PopoverContent";
