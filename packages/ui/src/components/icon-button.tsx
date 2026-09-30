"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const iconButton = cva(
  [
    "inline-flex items-center justify-center shrink-0",
    "size-[var(--d-tap)] rounded-[var(--d-radius-control)]",
    "transition-[background-color,color] duration-instant ease-out",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-[var(--d-icon)]",
  ],
  {
    variants: {
      variant: {
        ghost: "text-fg-muted hover:bg-sunken hover:text-fg",
        secondary: "bg-surface text-fg border border-line-strong shadow-sm hover:bg-sunken",
        primary: "bg-primary text-primary-fg shadow-sm hover:brightness-110",
      },
    },
    defaultVariants: { variant: "ghost" },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButton> {
  /** Required. An icon alone never communicates on its own. (R24.11) */
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, label, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(iconButton({ variant }), className)}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = "IconButton";
