"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * Sizing comes from density, not from a size prop. One implementation serves
 * office, station, and portal with no density branches of its own. (R24.1)
 */
const button = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium select-none",
    "min-h-[var(--d-tap)] px-[var(--d-pad-control-x)] rounded-[var(--d-radius-control)]",
    "text-[length:var(--d-text-body)]",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-instant ease-out",
    "active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-[var(--d-icon)] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg shadow-sm hover:brightness-110",
        secondary: "bg-surface text-fg border border-line-strong shadow-sm hover:bg-sunken",
        ghost: "bg-transparent text-fg hover:bg-sunken",
        accent: "bg-accent text-accent-fg shadow-sm hover:brightness-105",
        danger: "bg-danger text-white shadow-sm hover:brightness-110",
        quiet: "bg-primary-soft text-primary hover:brightness-95",
      },
      full: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", full: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, full, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-loading={loading || undefined}
        disabled={disabled ?? loading}
        className={cn(button({ variant, full }), className)}
        {...props}
      >
        {/* Slot needs exactly one child, so asChild passes children straight through. */}
        {asChild ? (
          children
        ) : (
          <>
            {loading ? (
              <>
                <span
                  aria-hidden
                  className="size-[1em] animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                <span className="sr-only">Working</span>
              </>
            ) : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
