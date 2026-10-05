"use client";
import * as React from "react";
import * as P from "@radix-ui/react-switch";
import { cn } from "../lib/cn";

export const Switch = React.forwardRef<
  React.ComponentRef<typeof P.Root>,
  React.ComponentPropsWithoutRef<typeof P.Root>
>(({ className, ...props }, ref) => (
  <P.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent",
      "bg-line-strong data-[state=checked]:bg-primary",
      "transition-colors duration-fast ease-out",
      "disabled:opacity-45 disabled:pointer-events-none",
      className,
    )}
    {...props}
  >
    <P.Thumb
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-white shadow-sm",
        "translate-x-0.5 data-[state=checked]:translate-x-[1.125rem]",
        "transition-transform duration-fast ease-out",
      )}
    />
  </P.Root>
));
Switch.displayName = "Switch";
