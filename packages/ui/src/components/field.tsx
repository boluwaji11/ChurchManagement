"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * A labelled form control.
 *
 * The label is always a label. Placeholder text disappears exactly when it is
 * needed, so it is never the label. (design-system section 12)
 *
 * Field wires the accessibility for you: it gives the control an id, points
 * aria-describedby at the hint and the error, and sets aria-invalid when there is
 * one. Doing it here rather than at every call site is the difference between a
 * pattern that holds and one that holds until someone is in a hurry.
 *
 * Native browser validation is never used. Its bubble is unstyled, unlocalised,
 * disappears on its own, and looks nothing like the rest of the product. Put
 * `noValidate` on the form and pass the message here instead.
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
  const auto = React.useId();
  const id = htmlFor ?? auto;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-fg flex items-center gap-1">
        {label}
        {required ? (
          <span className="text-fg-subtle font-normal" aria-hidden>
            (required)
          </span>
        ) : null}
      </label>

      {control}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-caption text-danger-text">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
