"use client";
import * as React from "react";
import * as P from "@radix-ui/react-tooltip";
import { cn } from "../lib/cn";

export const TooltipProvider = P.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    /*
     * Its own provider, as well as the one in the root layout.
     *
     * Radix refuses to render a tooltip that cannot find a provider in
     * context, and in development the module holding this one is re-evaluated
     * for a page the layout above it did not rebuild, so the root provider is
     * writing to a context object the Root here no longer reads. The throw
     * takes the whole screen with it and the page answers 500. Providing the
     * context where it is read means the pair can never be split. The cost is
     * the skip delay no longer carrying from one tooltip to the next, which
     * is worth a screen that renders.
     */
    <P.Provider delayDuration={200} skipDelayDuration={300}>
    <P.Root delayDuration={200}>
      <P.Trigger asChild>{children}</P.Trigger>
      <P.Portal>
        <P.Content
          side={side}
          sideOffset={6}
          /*
           * R24.x. A mark at the edge of a table, or on the last row of a
           * list, would otherwise put its tooltip off the screen. Radix
           * flips and shifts it; the padding keeps it off the glass.
           */
          collisionPadding={8}
          className={cn(
            // A column name that has been cut short can be long, and on a
            // phone it wraps here rather than running off the glass.
            "z-50 max-w-[min(18rem,calc(100vw-1rem))] rounded-md bg-stone-900 px-2.5 py-1.5 text-caption text-stone-50 shadow-md",
            "select-none data-[state=delayed-open]:animate-[connectapp-rise_var(--duration-fast)_var(--ease-out)]",
          )}
        >
          {content}
          <P.Arrow className="fill-stone-900" />
        </P.Content>
      </P.Portal>
    </P.Root>
    </P.Provider>
  );
}
