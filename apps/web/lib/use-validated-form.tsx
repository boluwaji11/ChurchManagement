"use client";

import * as React from "react";

export type Errors = Record<string, string | undefined>;

/**
 * Validation is ours, not the browser's.
 *
 * The native bubble is unstyled, unlocalised, vanishes on its own, speaks in
 * character counts, and looks like a different product. Every form in ConnectApp
 * sets `noValidate` and renders its messages through Field, which wires
 * aria-invalid and aria-describedby, and the first invalid control takes focus
 * so a keyboard or screen reader user lands on the problem.
 *
 * Errors appear on submit, then follow along as the field is corrected. Nagging
 * somebody mid-typing before they have finished is not help.
 *
 * `ready` is the other half of that and runs from the first keystroke: the
 * button stays dark until the form could actually be sent. Saying nothing
 * while somebody types, and still letting them press a button that cannot
 * work, is the worst of both.
 */
export function useValidatedForm(
  validate: (data: FormData) => Errors,
  submit: (data: FormData) => Promise<void | { error?: string }>,
) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const revalidate = React.useCallback(() => {
    if (!formRef.current) return;
    const found = validate(new FormData(formRef.current));
    setReady(!Object.values(found).some(Boolean));
    // What is wrong is said once they have asked to send it, and not before.
    if (submitted) setErrors(found);
  }, [submitted, validate]);

  /* A form whose fields are all optional can be sent as it stands, so the
     first answer is read before anybody types. */
  React.useEffect(revalidate, [revalidate]);

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

  return { formRef, errors, pending, ready, action, revalidate };
}
