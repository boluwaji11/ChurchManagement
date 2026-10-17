"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type Errors = Record<string, string | undefined>;

/** Only the entries that actually say something, so none of them blanks another. */
const prune = (errors: Errors): Errors =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));

/**
 * Validation is ours, not the browser's.
 *
 * The native bubble is unstyled, unlocalised, vanishes on its own, is worded in
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
  submit: (
    data: FormData,
  ) => Promise<void | { error?: string; field?: string; go?: string }>,
  /** What the boxes hold before anybody types, where a screen prefills one. */
  defaults: Record<string, string> = {},
) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  /*
   * R1.7. Every box's contents live here rather than in the box.
   *
   * React empties a form once a function given to `action` has run, and it has
   * to be given one: a server action that finishes by redirecting throws the
   * redirect for Next to catch, and Next only catches it on that path. Calling
   * the action by hand swallowed the throw, so a finished sign-up went
   * nowhere.
   *
   * So the reset is left alone and made harmless. It clears what the browser
   * is holding, and the browser is holding nothing: a controlled value comes
   * back from here on the next render exactly as it was typed.
   */
  const [values, setValues] = React.useState<Record<string, string>>(defaults);
  const [errors, setErrors] = React.useState<Errors>({});
  /*
   * R1.7. What the server said about a box, kept apart from what the boxes
   * say about themselves.
   *
   * The two disagree on purpose. "That address already has an account" is
   * true of a perfectly well-formed address, so client validation finds
   * nothing wrong and, sharing one bag of errors, immediately wiped the only
   * message there was. It stands until that box is changed, which is the one
   * thing that could make it untrue.
   */
  const [fromServer, setFromServer] = React.useState<Errors>({});
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
  const [ready, setReady] = React.useState(false);
  const [pending, setPending] = React.useState(false);
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

  /** One box, wired to the value above so a reset cannot take it away. */
  const field = React.useCallback(
    (name: string) => ({
      name,
      value: values[name] ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((was) => ({ ...was, [name]: event.target.value }));
        /* Changing the box answers whatever the server said about it. */
        setFromServer((was) => (was[name] ? { ...was, [name]: undefined } : was));
      },
    }),
    [values],
  );

  const action = async (data: FormData) => {
    setSubmitted(true);
    setFailed(undefined);
    setFromServer({});
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

      /*
       * R1.7. Where to go next comes back as an address rather than as a
       * redirect thrown inside the action.
       *
       * `redirect()` works by throwing, and Next catches that only on the
       * path where it dispatches the action itself. Called from a handler of
       * ours, the throw went nowhere: the account was made, the answer was
       * 200, and the screen sat exactly where it was. Saying where to go and
       * going there is the same journey with nothing to swallow.
       */
      if (answer?.go) {
        router.push(answer.go);
        return;
      }

      if (!answer?.error) return;

      /* A refusal about one box is said under that box, where the red outline
         says the same thing again. Anything about the form as a whole, or
         about the provider, goes above it. */
      if (answer.field) {
        const named = answer.field;
        setTouched((seen) => new Set(seen).add(named));
        setFromServer({ [named]: answer.error });
        const el = formRef.current?.elements.namedItem(named);
        if (el instanceof HTMLElement) el.focus();
        return;
      }
      setFailed(answer.error);
    } finally {
      setPending(false);
    }
  };

  /* What a box says about itself, and what the server said about it, as one. */
  const shownErrors: Errors = { ...errors, ...prune(fromServer) };

  return {
    formRef, errors: shownErrors, failed, pending, ready, action, revalidate, touch, field,
  };
}
