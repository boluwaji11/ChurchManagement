"use client";
import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export const Dialog = P.Root;
export const DialogTrigger = P.Trigger;
export const DialogClose = P.Close;

/**
 * One box, three kinds of thing in it, and they do not dismiss the same way.
 *
 * **A question that cannot be undone** (`alert`): no X, no click outside. The
 * footer carries the way out, named after the safe outcome, and it takes focus
 * when the box opens. Escape is exactly that button. A dangerous action is
 * never what the keyboard lands on.
 *
 * **A form**: the X stays, because a form has a header and that is where people
 * look, and Cancel sits in the footer because that is where they look next.
 *
 * **A panel that changed nothing**: the X alone. A Cancel on a panel that saved
 * nothing is a lie about what the button does.
 *
 * `closeLabel` is what decides: leave it out and no X is drawn. Nothing is
 * stacked on anything, so a dialog that would open a dialog is a flow to
 * rewrite rather than a prop to add.
 */
export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content> & {
    title: string;
    /**
     * Keeps the title for a screen reader without drawing it. For a box whose
     * whole content is one picture, where a heading above it says nothing the
     * picture does not.
     */
    hideTitle?: boolean;
    description?: string;
    /** Draws the X in the corner. Left out, there is no X. */
    closeLabel?: string;
    /** A question that cannot be undone: no X, no click outside, safe default. */
    alert?: boolean;
  }
>(({ className, children, title, description, closeLabel, alert, hideTitle, ...props }, ref) => (
  <P.Portal>
    <P.Overlay
      className={cn(
        "fixed inset-0 z-40 bg-overlay",
        "data-[state=open]:animate-[hearth-fade_var(--duration-base)_var(--ease-out)]",
      )}
    />
    <P.Content
      ref={ref}
      role={alert ? "alertdialog" : undefined}
      onPointerDownOutside={(event) => {
        if (alert) event.preventDefault();
        props.onPointerDownOutside?.(event);
      }}
      onOpenAutoFocus={(event) => {
        if (!alert) {
          props.onOpenAutoFocus?.(event);
          return;
        }
        // The way out takes focus, never the way through.
        const box = event.currentTarget as HTMLElement | null;
        const safe = box?.querySelector<HTMLElement>("[data-dismiss]");
        if (safe) {
          event.preventDefault();
          safe.focus();
        }
        props.onOpenAutoFocus?.(event);
      }}
      className={cn(
        // Centred by margins rather than a translate. A transform on this box
        // would become the containing block for anything positioned inside it,
        // and a date field's calendar has to be placed against the window.
        "fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-2rem)] max-w-lg",
        // A form with six steps has to be reachable on a phone. Without this it
        // runs off the bottom and the submit button cannot be got to at all.
        "max-h-[calc(100dvh-2rem)] overflow-y-auto",
        "rounded-xl border border-line bg-surface shadow-lg p-6",
        "data-[state=open]:animate-[hearth-pop_var(--duration-base)_var(--ease-out)]",
        className,
      )}
      {...props}
    >
      <div className={cn("flex items-start justify-between gap-4", hideTitle ? "" : "mb-4")}>
        <div className={cn("flex flex-col gap-1", hideTitle && "sr-only")}>
          <P.Title className="text-heading font-display text-fg">{title}</P.Title>
          {description ? (
            <P.Description className="text-caption text-fg-muted">{description}</P.Description>
          ) : null}
        </div>
        {closeLabel ? (
          <P.Close
            aria-label={closeLabel}
            className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-sunken hover:text-fg transition-colors duration-instant"
          >
            <X className="size-4" />
          </P.Close>
        ) : null}
      </div>
      {children}
    </P.Content>
  </P.Portal>
));
DialogContent.displayName = "DialogContent";

/**
 * The row of buttons at the end of a dialog, in one order everywhere.
 *
 * Right-aligned, with the way out first and the action last, so the action sits
 * where the eye finishes the sentence it just read. Marking the way out
 * `data-dismiss` puts the keyboard on it when the question cannot be undone.
 */
export function DialogFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-wrap items-center justify-end gap-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
