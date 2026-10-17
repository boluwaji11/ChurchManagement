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
 * Errors appear once somebody has finished with a field and moved off it, and
 * on submit for anything they never touched. Then they follow along as the
 * field is corrected. Nagging somebody mid-typing before they have finished is
 * not help.
 *
 * **Waiting for submit alone does not work on a form whose button is gated.**
 * `ready` keeps the button dark until the form could be sent, which is what
 * this product asks for, and a browser will not submit on Enter either while
 * the default button is disabled. So a form with one bad field answered every
 * press with nothing at all: no error, no send, and no way to find out which
 * field was wrong. Leaving a field is the moment somebody has decided what
 * goes in it, so it is the moment to say.
 */
export function useValidatedForm(
  validate: (data: FormData) => Errors,
  submit: (data: FormData) => Promise<void | { error?: string }>,
) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  /*
   * What the server said, as opposed to what the fields say.
   *
   * A server action that answers a bad form by redirecting back to the screen
   * throws away everything typed into it, and somebody who mistyped one field
   * retypes all of them. Answering with a message instead leaves the form
   * standing, so the action hands one back and this is where it is kept.
   */
  const [failed, setFailed] = React.useState<string>();
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  /** The fields somebody has already finished with. */
  const [touched, setTouched] = React.useState<Set<string>>(() => new Set());

  /** What is wrong, kept back until the reader has earned the right to hear it. */
  const shown = React.useCallback(
    (found: Errors, seen: Set<string>, asked: boolean): Errors =>
      asked
        ? found
        : Object.fromEntries(
            Object.entries(found).map(([key, message]) => [
              key,
              seen.has(key) ? message : undefined,
            ]),
          ),
    [],
  );

  const revalidate = React.useCallback(() => {
    if (!formRef.current) return;
    const found = validate(new FormData(formRef.current));
    setReady(!Object.values(found).some(Boolean));
    setErrors(shown(found, touched, submitted));
  }, [shown, submitted, touched, validate]);

  /**
   * Somebody has left a field, so whatever is wrong with that one is said.
   *
   * React's onBlur is focusout underneath, which bubbles, so one handler on
   * the form covers every control in it.
   */
  const touch = React.useCallback(
    (event: React.FocusEvent<HTMLFormElement>) => {
      const name = (event.target as { name?: string }).name;
      if (!name || !formRef.current) return;

      const seen = new Set(touched).add(name);
      setTouched(seen);
      setErrors(shown(validate(new FormData(formRef.current)), seen, submitted));
    },
    [shown, submitted, touched, validate],
  );

  /* A form whose fields are all optional can be sent as it stands, so the
     first answer is read before anybody types. */
  React.useEffect(revalidate, [revalidate]);

  const action = async (data: FormData) => {
    setSubmitted(true);
    setFailed(undefined);
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
      const answer = await submit(data);
      if (answer?.error) setFailed(answer.error);
    } finally {
      setPending(false);
    }
  };

  return { formRef, errors, failed, pending, ready, action, revalidate, touch };
}
