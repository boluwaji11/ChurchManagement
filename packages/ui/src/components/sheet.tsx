"use client";

import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export const Sheet = P.Root;
export const SheetTrigger = P.Trigger;
export const SheetClose = P.Close;

/**
 * R24.6. A surface over the screen it came from.
 *
 * The side layout enters from the right. The centered layout keeps member
 * records close to the directory. Both scroll the body and pin their actions.
 */
export function SheetContent({
  title,
  closeLabel,
  actions,
  footer,
  width = "440px",
  layout = "side",
  children,
  className,
  bodyClassName,
}: {
  title: string;
  closeLabel: string;
  /** What this record's own actions are, beside the close square. */
  actions?: React.ReactNode;
  /** The row of actions along the bottom. */
  footer?: React.ReactNode;
  width?: string;
  layout?: "side" | "centered";
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <P.Portal>
      <P.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[connectapp-fade_var(--duration-fast)_var(--ease-out)]" />
      <P.Content
        /*
         * R24.6. Says there is an overlay over the page.
         *
         * The floating marks a screen carries, the message launcher above all,
         * sit in the corner a panel's own footer lands in. Anything that
         * covers the page carries this, and they stand down while it is open.
         */
        data-overlay=""
        /*
         * R24.6. A list portalled to the body, such as the combobox's, is
         * inside this panel as far as the reader is concerned. Without this,
         * a press on one of its options reads as a press outside and shuts
         * the panel they are working in.
         */
        onPointerDownOutside={(event) => {
          if ((event.target as Element | null)?.closest("[data-portal-list]")) {
            event.preventDefault();
          }
        }}
        className={cn(
          layout === "centered"
            ? [
                "fixed inset-x-0 top-0 bottom-[env(safe-area-inset-bottom)] z-50 m-auto",
                "flex h-[min(680px,calc(100dvh-3rem-env(safe-area-inset-bottom)))]",
                "max-h-[calc(100dvh-3rem-env(safe-area-inset-bottom))] max-w-[880px]",
                "flex-col overflow-hidden rounded-xl border border-line bg-canvas shadow-lg",
                "data-[state=open]:animate-[connectapp-pop_var(--duration-base)_var(--ease-out)]",
              ].join(" ")
            : [
                "fixed inset-y-0 right-0 z-50 flex h-full flex-col bg-canvas shadow-lg",
                "data-[state=open]:animate-[connectapp-slide-in_var(--duration-base)_var(--ease-out)]",
              ].join(" "),
          className,
        )}
        style={{
          width: layout === "centered"
            ? `min(${width}, calc(100vw - 2rem))`
            : `min(${width}, 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-5 sm:px-6">
          {/* min-w-0 so a long title wraps inside the panel rather than
              pushing the close square off a phone's right edge. */}
          <P.Title className="min-w-0 font-display text-[22px] break-words text-fg">{title}</P.Title>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <P.Close
              aria-label={closeLabel}
              className="grid size-8 place-items-center rounded-sm bg-line text-fg hover:brightness-95"
            >
              <X className="size-4" aria-hidden />
            </P.Close>
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col gap-4 overflow-auto p-4 sm:p-6", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          /*
           * R24.6. Three buttons do not fit one line at 390px, so the row
           * wraps, and the bottom padding clears the phone's own inset: the
           * panel runs to the glass and Save would otherwise sit under the
           * home indicator.
           */
          <div
            className={cn(
              "flex flex-wrap items-center justify-end gap-2",
              "border-t border-line bg-surface px-4 py-4 sm:px-6",
              "pb-[calc(1rem+env(safe-area-inset-bottom))]",
            )}
          >
            {footer}
          </div>
        ) : null}
      </P.Content>
    </P.Portal>
  );
}
