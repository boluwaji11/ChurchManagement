import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-sunken text-fg-muted border border-line",
        primary: "bg-primary-soft text-primary",
        accent: "bg-accent-soft text-ember-800",
        success: "bg-success-soft text-success-text",
        warning: "bg-warning-soft text-warning-text",
        danger: "bg-danger-soft text-danger-text",
        info: "bg-info-soft text-info-text",
        critical: "bg-critical text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export const Badge = ({ className, tone, ...props }: BadgeProps) => (
  <span className={cn(badge({ tone }), className)} {...props} />
);

/** A filter chip. Removable, toggleable, always labelled. */
export const Chip = ({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-label",
      "transition-colors duration-instant ease-out [&_svg]:size-3.5",
      selected
        ? "bg-primary text-primary-fg border-primary"
        : "bg-surface text-fg-muted border-line-strong hover:bg-sunken hover:text-fg",
      className,
    )}
    {...props}
  />
);
