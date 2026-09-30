"use client";
import * as React from "react";
import * as P from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

export const Select = P.Root;
export const SelectValue = P.Value;

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof P.Trigger>,
  React.ComponentPropsWithoutRef<typeof P.Trigger>
>(({ className, children, ...props }, ref) => (
  <P.Trigger
    ref={ref}
    className={cn(
      "inline-flex w-full items-center justify-between gap-2 bg-surface text-fg text-left",
      "min-h-[var(--d-tap)] px-[var(--d-pad-control-x)] rounded-[var(--d-radius-control)]",
      "text-[length:var(--d-text-body)] border border-line-strong shadow-sm",
      "transition-colors duration-instant ease-out hover:border-fg-subtle",
      "disabled:opacity-45 disabled:pointer-events-none",
      "data-[placeholder]:text-fg-subtle",
      className,
    )}
    {...props}
  >
    {children}
    <P.Icon asChild>
      <ChevronDown className="size-4 opacity-60 shrink-0" />
    </P.Icon>
  </P.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <P.Portal>
    <P.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-lg border border-line bg-surface shadow-lg p-1",
        "data-[state=open]:animate-[hearth-rise_var(--duration-fast)_var(--ease-out)]",
        className,
      )}
      {...props}
    >
      <P.Viewport className="max-h-72">{children}</P.Viewport>
    </P.Content>
  </P.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof P.Item>,
  React.ComponentPropsWithoutRef<typeof P.Item>
>(({ className, children, ...props }, ref) => (
  <P.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md",
      "py-2 pl-2 pr-8 text-[length:var(--d-text-body)] outline-none",
      "data-[highlighted]:bg-sunken data-[state=checked]:text-primary",
      "data-[disabled]:opacity-45 data-[disabled]:pointer-events-none",
      className,
    )}
    {...props}
  >
    <P.ItemText>{children}</P.ItemText>
    <P.ItemIndicator className="absolute right-2 flex items-center">
      <Check className="size-4" />
    </P.ItemIndicator>
  </P.Item>
));
SelectItem.displayName = "SelectItem";
