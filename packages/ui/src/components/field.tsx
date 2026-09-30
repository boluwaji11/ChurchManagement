import * as React from "react";
import { cn } from "../lib/cn";

/**
 * A label is always a label. Placeholder text disappears exactly when it is
 * needed, so it is never the label. (design-system section 12)
 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-label text-fg flex items-center gap-1">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="text-caption text-danger-text flex items-start gap-1.5">{error}</p>
      ) : hint ? (
        <p className="text-caption text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}
