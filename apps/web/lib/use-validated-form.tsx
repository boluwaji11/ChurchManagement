"use client";

import * as React from "react";

export type Errors = Record<string, string | undefined>;

/**
 * Validation is ours, not the browser's.
 *
 * The native bubble is unstyled, unlocalised, vanishes on its own, speaks in
 * character counts, and looks like a different product. Every form in Hearth
 * sets `noValidate` and renders its messages through Field, which wires
 * aria-invalid and aria-describedby, and the first invalid control takes focus
 * so a keyboard or screen reader user lands on the problem.
 *
 * Errors appear on submit, then follow along as the field is corrected. Nagging
 * somebody mid-typing before they have finished is not help.
 */
export function useValidatedForm(
  validate: (data: FormData) => Errors,
  submit: (data: FormData) => Promise<void | { error?: string }>,
) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const revalidate = React.useCallback(() => {
    if (!submitted || !formRef.current) return;
    setErrors(validate(new FormData(formRef.current)));
  }, [submitted, validate]);

  const action = async (data: FormData) => {
    setSubmitted(true);
    const found = validate(data);
    setErrors(found);

    const firstInvalid = Object.keys(found).find((key) => found[key]);
    if (firstInvalid) {
      const el = formRef.current?.elements.namedItem(firstInvalid);
      if (el instanceof HTMLElement) el.focus();
      return;
    }

    setPending(true);
    try {
      await submit(data);
    } finally {
      setPending(false);
    }
  };

  return { formRef, errors, pending, action, revalidate };
}
