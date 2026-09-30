"use client";
import * as React from "react";
import * as P from "@radix-ui/react-separator";
import { cn } from "../lib/cn";

export const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentPropsWithoutRef<typeof P.Root>) => (
  <P.Root
    orientation={orientation}
    className={cn("bg-line shrink-0", orientation === "horizontal" ? "h-px w-full" : "w-px h-full", className)}
    {...props}
  />
);
