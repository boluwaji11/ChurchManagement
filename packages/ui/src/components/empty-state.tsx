import * as React from "react";
import { cn } from "../lib/cn";
import { HUES } from "./hue";

/**
 * An illustration, not a grey icon and an apology. A church's first week in the
 * product should feel like an invitation. (R24.17)
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-line-strong",
        "bg-sunken/40 px-6 py-12 text-center",
        className,
      )}
    >
      <svg
        viewBox="0 0 160 96"
        className="h-24 w-40"
        role="img"
        aria-label="An empty room, waiting"
      >
        {/* A hearth: a warm room waiting to be filled. Drawn in spectrum hues. */}
        <rect x="14" y="30" width="132" height="54" rx="8" fill="var(--hue-clay-tint)" />
        <path d="M14 38 L80 8 L146 38" fill="none" stroke="var(--hue-clay-500)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="58" y="52" width="44" height="32" rx="4" fill="var(--hue-amber-tint)" stroke="var(--hue-amber-500)" strokeWidth="2" />
        <path d="M80 78 C 72 70, 74 64, 80 58 C 86 64, 88 70, 80 78 Z" fill="var(--hue-coral-500)" />
        {HUES.slice(0, 5).map((h, i) => (
          <circle key={h} cx={28 + i * 7} cy={72} r={3} fill={`var(--hue-${h}-500)`} opacity={0.75} />
        ))}
        {HUES.slice(5, 10).map((h, i) => (
          <circle key={h} cx={112 + i * 7} cy={72} r={3} fill={`var(--hue-${h}-500)`} opacity={0.75} />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 max-w-sm">
        <h3 className="font-display text-heading text-fg">{title}</h3>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
