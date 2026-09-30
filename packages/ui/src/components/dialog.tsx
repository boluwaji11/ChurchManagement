"use client";
import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export const Dialog = P.Root;
export const DialogTrigger = P.Trigger;
export const DialogClose = P.Close;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content> & { title: string; description?: string; closeLabel?: string }
>(({ className, children, title, description, closeLabel = "Close", ...props }, ref) => (
  <P.Portal>
    <P.Overlay
      className={cn(
        "fixed inset-0 z-40 bg-overlay",
        "data-[state=open]:animate-[hearth-fade_var(--duration-base)_var(--ease-out)]",
      )}
    />
    <P.Content
      ref={ref}
      className={cn(
        // Centred by margins rather than a translate. A transform on this box
        // would become the containing block for anything positioned inside it,
        // and a date field's calendar has to be placed against the window.
        "fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-2rem)] max-w-lg",
        "rounded-xl border border-line bg-surface shadow-lg p-6",
        "data-[state=open]:animate-[hearth-pop_var(--duration-base)_var(--ease-out)]",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <P.Title className="text-heading font-display text-fg">{title}</P.Title>
          {description ? (
            <P.Description className="text-caption text-fg-muted">{description}</P.Description>
          ) : null}
        </div>
        <P.Close
          aria-label={closeLabel}
          className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-sunken hover:text-fg transition-colors duration-instant"
        >
          <X className="size-4" />
        </P.Close>
      </div>
      {children}
    </P.Content>
  </P.Portal>
));
DialogContent.displayName = "DialogContent";
