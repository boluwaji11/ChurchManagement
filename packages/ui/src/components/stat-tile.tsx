import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../lib/cn";
import type { Hue } from "./hue";

/**
 * A dashboard tile, tinted by domain: 100 background, keyed heading, one mark.
 * Six tiles, six hues, one glance. (design-system: where the interface is colourful)
 */
export function StatTile({
  label,
  value,
  hue,
  delta,
  caption,
  icon,
  className,
}: {
  label: string;
  value: string;
  hue: Hue;
  delta?: number;
  caption?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const Trend = delta === undefined ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <div
      className={cn("flex flex-col gap-2 rounded-lg p-[var(--d-pad-card)] border", className)}
      style={{
        background: `var(--hue-${hue}-tint)`,
        borderColor: `color-mix(in oklch, var(--hue-${hue}-500) 22%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label font-medium" style={{ color: `var(--hue-${hue}-key)` }}>
          {label}
        </span>
        {icon ? (
          <span aria-hidden className="opacity-70" style={{ color: `var(--hue-${hue}-key)` }}>
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
