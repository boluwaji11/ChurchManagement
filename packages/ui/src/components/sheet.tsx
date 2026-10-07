"use client";

import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export const Sheet = P.Root;
export const SheetTrigger = P.Trigger;
export const SheetClose = P.Close;

/**
 * R24.6. A form that comes in from the right.
 *
 * 440px over a dim, the title in Fraunces at 22 with a close square beside it,
 * the body scrolling on its own, and the actions pinned to the bottom. The
 * screen behind stays in view, which is the point: you are adding to the thing
 * you were just looking at.
 */
export function SheetContent({
  title,
  closeLabel,
  footer,
  width = "440px",
  children,
  className,
}: {
  title: string;
  closeLabel: string;
  /** The row of actions along the bottom. */
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <P.Portal>
      <P.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-[connectapp-fade_var(--duration-fast)_var(--ease-out)]" />
      <P.Content
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
          "fixed inset-y-0 right-0 z-50 flex h-full flex-col bg-canvas shadow-lg",
          "data-[state=open]:animate-[connectapp-slide-in_var(--duration-base)_var(--ease-out)]",
          className,
        )}
        style={{ width: `min(${width}, 100%)` }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <P.Title className="font-display text-[22px] text-fg">{title}</P.Title>
          <P.Close
            aria-label={closeLabel}
            className="grid size-8 place-items-center rounded-sm bg-line text-fg hover:brightness-95"
          >
            <X className="size-4" aria-hidden />
          </P.Close>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4">
            {footer}
          </div>
        ) : null}
      </P.Content>
    </P.Portal>
  );
}
