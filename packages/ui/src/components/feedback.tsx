import * as React from "react";
import { cn } from "../lib/cn";

/** Skeletons, never spinners, for anything over 300ms. Under 300ms, show nothing. */
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden
    className={cn("animate-pulse rounded-md bg-sunken", className)}
    style={{ animationDuration: "1.4s" }}
    {...props}
  />
);

export const Spinner = ({ className, label = "Loading" }: { className?: string; label?: string }) => (
  <span role="status" className={cn("inline-flex items-center", className)}>
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
    />
    <span className="sr-only">{label}</span>
  </span>
);

export function Progress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-slow ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
