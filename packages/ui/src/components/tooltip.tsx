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
            "z-50 rounded-md bg-stone-900 px-2.5 py-1.5 text-caption text-stone-50 shadow-md",
            "select-none data-[state=delayed-open]:animate-[connectapp-rise_var(--duration-fast)_var(--ease-out)]",
          )}
        >
          {content}
          <P.Arrow className="fill-stone-900" />
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
