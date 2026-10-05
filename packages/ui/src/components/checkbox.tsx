"use client";
import * as React from "react";
import * as P from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/cn";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof P.Root>,
  React.ComponentPropsWithoutRef<typeof P.Root>
>(({ className, ...props }, ref) => (
  <P.Root
    ref={ref}
    className={cn(
      "peer shrink-0 cursor-pointer rounded-[6px] border border-line-strong bg-surface shadow-sm",
      "size-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary",
      "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary",
      "transition-colors duration-instant ease-out",
      "disabled:opacity-45 disabled:pointer-events-none",
      className,
    )}
    {...props}
  >
    <P.Indicator className="flex items-center justify-center text-primary-fg">
      {props.checked === "indeterminate" ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
    </P.Indicator>
  </P.Root>
));
Checkbox.displayName = "Checkbox";
