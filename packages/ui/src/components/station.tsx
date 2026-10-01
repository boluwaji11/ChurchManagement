import * as React from "react";
import { AlertTriangle, WifiOff, Wifi } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * Station components. The station is a kiosk, not a page, and a mistake here is
 * a safety incident rather than a support ticket. (PRD 8.8, R24.14)
 */

/**
 * Allergies and medical notes. Full width, above the fold, icon and word, and it
 * cannot be scrolled past. R8.10 requires the volunteer to have seen it, so the
 * layout makes not seeing it impossible.
 */
export function CriticalBanner({
  heading,
  items,
  className,
}: {
  heading: string;
  items: string[];
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "w-full rounded-lg bg-critical text-white shadow-md",
        "px-[var(--d-pad-card)] py-[var(--d-pad-card)]",
        className,
      )}
    >
      <p className="flex items-center gap-3 font-semibold uppercase tracking-wide text-[length:var(--d-text-body)]">
        <AlertTriangle className="size-[var(--d-icon)] shrink-0" aria-hidden />
        {heading}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md bg-white/15 px-3 py-1 text-[length:var(--d-text-body)] font-medium"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A security code, in mono, at display size. A volunteer reads this aloud across
 * a room, which is why the face is chosen so 0 and O cannot be confused. (R24.7)
 */
export function CodeDisplay({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {label ? <span className="text-label text-fg-muted uppercase tracking-wide">{label}</span> : null}
      <span
        data-numeric
        className="font-mono text-display font-semibold tracking-[0.15em] text-fg"
        aria-label={`Code ${code.split("").join(" ")}`}
      >
        {code}
      </span>
    </div>
  );
}

/**
 * Connection state is persistent chrome, never a toast. R8.22 says the station
 * never silently fails, and a notification that disappears is a silent failure.
 */
export function OfflineBar({
  online,
  label,
  className,
}: {
  online: boolean;
  /** The product's own words. A component library does not hold copy. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full items-center justify-center gap-2.5 px-4 py-2 text-label font-medium",
        online ? "bg-success-soft text-success-text" : "bg-warning text-stone-950",
        className,
      )}
    >
      {online ? (
        <Wifi className="size-4 shrink-0" aria-hidden />
      ) : (
        <WifiOff className="size-4 shrink-0" aria-hidden />
      )}
      <span>{label}</span>
    </div>
  );
}

/**
 * A blocking warning is blocking. A custody restriction or a failed pickup code
 * is a full-screen interrupt with one deliberate action, not a dismissible
 * dialog and never a toast. (R8.9, R24.14)
 */
export function BlockingInterrupt({
  heading,
  detail,
  action,
  className,
}: {
  heading: string;
  detail: string;
  action: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-xl bg-critical text-white",
        "px-8 py-12 text-center shadow-lg",
        className,
      )}
    >
      <AlertTriangle className="size-16 shrink-0" aria-hidden />
      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="font-display text-display-lg leading-tight">{heading}</h2>
        <p className="text-body-lg text-white/90">{detail}</p>
      </div>
      {action}
    </div>
  );
}
