"use client";
import * as React from "react";
import * as P from "@radix-ui/react-tabs";
import { cn } from "../lib/cn";

export const Tabs = P.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof P.List>,
  React.ComponentPropsWithoutRef<typeof P.List>
>(({ className, ...props }, ref) => (
  <P.List
    ref={ref}
    /*
     * R24.6. Five tabs are wider than a phone, so the row scrolls inside
     * itself. Squashing them stacks each label two words deep and the row
     * stops reading as a row; spilling them takes the page off the side.
     * The bar is hidden because the tabs themselves show there is more.
     */
    className={cn(
      "flex items-center gap-1 border-b border-line",
      "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof P.Trigger>,
  React.ComponentPropsWithoutRef<typeof P.Trigger>
>(({ className, ...props }, ref) => (
  <P.Trigger
    ref={ref}
    className={cn(
      "relative shrink-0 cursor-pointer whitespace-nowrap px-3 py-2 text-label text-fg-muted -mb-px border-b-2 border-transparent",
      "transition-colors duration-fast ease-out hover:text-fg",
      "data-[state=active]:text-fg data-[state=active]:border-accent",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof P.Content>,
  React.ComponentPropsWithoutRef<typeof P.Content>
>(({ className, ...props }, ref) => (
  <P.Content ref={ref} className={cn("pt-4 outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
