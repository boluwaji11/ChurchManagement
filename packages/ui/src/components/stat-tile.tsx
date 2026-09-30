import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../lib/cn";
import type { Hue } from "./hue";

/**
 * A dashboard tile.
 *
 * Restrained by default: a plain surface, a hairline, and one small keyed mark.
 * A row of fully tinted tiles reads as decoration rather than information, and
 * the eye stops sorting them. Pass `emphasis="tint"` for the one tile that
 * genuinely needs to be seen first, not for all of them.
 */
export function StatTile({
  label,
  value,
  hue,
  delta,
  caption,
  icon,
  emphasis = "quiet",
  className,
}: {
  label: string;
  value: string;
  hue: Hue;
  delta?: number;
  caption?: string;
  icon?: React.ReactNode;
  emphasis?: "quiet" | "tint";
  className?: string;
}) {
  const Trend = delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tinted = emphasis === "tint";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-[var(--d-pad-card)]",
        tinted ? "" : "bg-surface border-line shadow-sm",
        className,
      )}
      style={
        tinted
          ? {
              background: `var(--hue-${hue}-tint)`,
              borderColor: `color-mix(in oklch, var(--hue-${hue}-500) 22%, transparent)`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-label font-medium"
          style={{ color: tinted ? `var(--hue-${hue}-key)` : undefined }}
        >
          {label}
        </span>
        {icon ? (
          <span
            aria-hidden
            className={cn("inline-flex items-center justify-center", tinted ? "opacity-70" : "rounded-md p-1")}
            style={
              tinted
                ? { color: `var(--hue-${hue}-key)` }
                : { background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }
            }
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p data-numeric className="font-display text-display leading-none text-fg">
        {value}
      </p>
      <div className="flex items-center gap-1.5 text-caption text-fg-muted">
        {Trend ? <Trend className="size-3.5 shrink-0" aria-hidden /> : null}
        {delta !== undefined ? (
          <span data-numeric>
            {delta > 0 ? "+" : ""}
            {delta}%
          </span>
        ) : null}
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  );
}
