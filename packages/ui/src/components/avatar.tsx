import * as React from "react";
import { cn } from "../lib/cn";
import { HUES, hueForId, type Hue } from "./hue";

/**
 * No photo is the normal case in a church directory, so the fallback is the
 * real design: initials on a tinted chip, hue derived from the id, so a roster
 * is colourful and people are recognisable before you read a name.
 */
export function Avatar({
  name,
  src,
  id,
  size = "md",
  hue,
  className,
}: {
  name: string;
  src?: string | null;
  id?: string;
  size?: "sm" | "md" | "lg" | "xl";
  hue?: Hue;
  className?: string;
}) {
  const dims = { sm: "size-7 text-caption", md: "size-9 text-label", lg: "size-12 text-title", xl: "size-16 text-heading" }[size];
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
  const h = hue ?? hueForId(id ?? name);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium overflow-hidden shrink-0",
        "ring-1 ring-inset ring-black/5",
        dims,
        className,
      )}
      style={src ? undefined : { background: `var(--hue-${h}-tint)`, color: `var(--hue-${h}-key)` }}
      aria-hidden={false}
      title={name}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials || "?"}</span>
      )}
    </span>
  );
}

export { HUES };
