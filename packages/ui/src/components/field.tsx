"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * What Field hands down to a control that cannot be cloned.
 *
 * Cloning works for an input, because an input takes id and aria props and puts
 * them on its own element. A Select is three components deep and its root draws
 * nothing, so the props have to reach the trigger by context. A control that
 * reads this gets the same wiring an input gets.
 */
export interface FieldControl {
  id: string;
  labelId: string;
  invalid: boolean;
  describedBy?: string;
  required?: boolean;
}

const FieldControlContext = React.createContext<FieldControl | null>(null);

/** Read by Select, Combobox, DatePicker, TimePicker and RadioGroup. */
export function useFieldControl() {
  return React.useContext(FieldControlContext);
}

/** A component with this static takes its wiring from context rather than a clone. */
type Managed = { connectappFieldManaged?: boolean; connectappFieldGroup?: boolean };

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
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  const type = React.isValidElement(children) ? (children.type as Managed) : undefined;
  const managed = type?.connectappFieldManaged === true;
  const group = type?.connectappFieldGroup === true;

  const control =
    React.isValidElement(children) && !managed
      ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy,
          "aria-required": required || undefined,
        })
      : children;

  const wiring: FieldControl = {
    id,
    labelId,
    invalid: Boolean(error),
    describedBy,
    required,
  };

  // A radio group is labelled by a heading, because there is no single control
  // for a label element to point at.
  const Label = group ? "span" : "label";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        id={labelId}
        htmlFor={group ? undefined : id}
        className="flex items-center gap-1 text-[length:var(--d-text-label)] font-medium leading-[var(--d-leading-label)] text-fg"
      >
        {label}
        {/* The control carries aria-required, so this is decoration for the eye
            and is hidden from a screen reader rather than read as "star". */}
        {required ? (
          <span className="text-danger-text" aria-hidden>
            *
          </span>
        ) : null}
      </Label>

      {/* Under the question and above the box, because it is read before the
          answer is given rather than after. */}
      {hint ? (
        <p id={hintId} className="text-[length:var(--d-text-caption)] leading-[var(--d-leading-caption)] text-fg-muted">
          {hint}
        </p>
      ) : null}

      <FieldControlContext.Provider value={wiring}>{control}</FieldControlContext.Provider>

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[length:var(--d-text-caption)] leading-[var(--d-leading-caption)] text-danger-text">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
