"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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

const PROGRESS_TONE = {
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;

export function Progress({
  value,
  max = 100,
  label,
  tone = "primary",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  /** A quota bar that is nearly full says so in colour as well as in words. */
  tone?: keyof typeof PROGRESS_TONE;
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
        className={cn("h-full rounded-full transition-[width] duration-slow ease-out", PROGRESS_TONE[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * R24.6. The screen is busy.
 *
 * A panel in the middle of the screen for work the reader has to wait through:
 * a logo uploading, an import running, an export being built. It sits over the
 * page because the answer to "did my click do anything" belongs where the eye
 * already is, and it holds the pointer off the controls underneath while the
 * work runs.
 *
 * Under prefers-reduced-motion the ring stops turning and the words carry it.
 *
 * It is drawn on the body rather than where it is written, because a panel
 * written inside a sticky header or a transformed pane is trapped in that
 * pane's own stacking context: the screen dims under it and the bar it was
 * written in stays bright, which reads as the bar still being live.
 */
export function Working({ open, label }: { open: boolean; label: string }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center bg-overlay"
    >
      <span className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-5 py-4 shadow-lg">
        <span
          aria-hidden
          className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-primary motion-reduce:animate-none"
        />
        <span className="text-[length:var(--d-text-body)] font-medium text-fg">{label}</span>
      </span>
    </div>,
    document.body,
  );
}
