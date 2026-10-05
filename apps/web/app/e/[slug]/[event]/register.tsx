"use client";

import * as React from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { Banner, Button, Field, IconButton, Input } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import {
  checkSubmission, visibleFields,
  type FormAnswer, type FormFieldDef,
} from "@hearth/db/rules";
import { Empty } from "@/components/empty";
import { Answer } from "@/components/form-answer";
import { registerParty } from "./actions";

interface Person {
  key: string;
  name: string;
  email: string;
  phone: string;
  answers: Record<string, FormAnswer>;
}

const blank = (): Person => ({
  key: Math.random().toString(36).slice(2),
  name: "",
  email: "",
  phone: "",
  answers: {},
});

/** The three things a registration asks, in the order it asks them. */
type Step = "who" | "questions" | "confirm";

/**
 * R14.2, R14.5, R14.6. Taking a place, for somebody with no account.
 *
 * Asked in steps rather than as one column: who is coming, then what each of
 * them answers, then what is about to be sent. A parent registering three
 * children meets three short screens instead of one page of forty fields, and
 * the answers stay attached to the child they are about, because a church
 * needs to know which child is allergic to what.
 *
 * A step with nothing in it is dropped, so an event asking no questions is two
 * screens and an event asking none and taking one person is nearly one.
 */
export function Register({
  churchSlug,
  eventSlug,
  today,
  state,
  questions,
  preview = false,
}: {
  churchSlug: string;
  eventSlug: string;
  today: string;
  state: "none" | "open" | "waitlist" | "full" | "closed" | "cancelled";
  questions: FormFieldDef[];
  /** R14.2. Drawn, and refusing to send, so a preview takes no places. */
  preview?: boolean;
}) {
  const [party, setParty] = React.useState<Person[]>([blank()]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [failed, setFailed] = React.useState<string>();
  const [done, setDone] = React.useState<{ going: number; waiting: number } | null>(null);
  const [sending, startTransition] = React.useTransition();
  const [at, setAt] = React.useState(0);
  const trap = React.useRef<HTMLInputElement>(null);

  const steps: Step[] = [
    "who",
    ...(questions.length > 0 ? (["questions"] as Step[]) : []),
    "confirm",
  ];
  const step = steps[Math.min(at, steps.length - 1)]!;

  const change = (key: string, patch: Partial<Person>) =>
    setParty((was) => was.map((one) => (one.key === key ? { ...one, ...patch } : one)));

  const answer = (key: string, fieldId: string, value: FormAnswer) => {
    setParty((was) =>
      was.map((one) =>
        one.key === key ? { ...one, answers: { ...one.answers, [fieldId]: value } } : one,
      ),
    );
    setErrors((was) => (was[`${key}:${fieldId}`] ? { ...was, [`${key}:${fieldId}`]: "" } : was));
  };

  /** What a person is called once they have typed a name, and until then. */
  const calls = (person: Person, index: number) =>
    person.name.trim() || t("publicEvent.person", { number: index + 1 });

  /**
   * Each step is checked before it is left, so an answer is corrected where it
   * was given rather than three screens later.
   */
  const ready = (which: Step): boolean => {
    const found: Record<string, string> = {};

    if (which === "who") {
      for (const person of party) {
        if (!person.name.trim()) found[`${person.key}:name`] = t("publicEvent.nameRequired");
      }
    }

    if (which === "questions") {
      for (const person of party) {
        for (const problem of checkSubmission(questions, person.answers)) {
          found[`${person.key}:${problem.fieldId}`] = t(problem.message as never);
        }
      }
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const forward = () => {
    if (!ready(step)) return;
    setFailed(undefined);
    setAt((was) => was + 1);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== "confirm") {
      forward();
      return;
    }
    if (preview) return;
    setFailed(undefined);
    setErrors({});

    startTransition(async () => {
      const result = await registerParty({
        churchSlug,
        eventSlug,
        today,
        party: party.map((one) => ({
          name: one.name,
          email: one.email,
          phone: one.phone,
          answers: one.answers,
        })),
        trap: trap.current?.value ?? "",
      });

      if (result.ok) {
        setDone({ going: result.going ?? 0, waiting: result.waiting ?? 0 });
        return;
      }

      // Keyed by the person they belong to, so an answer missing on the third
      // child shows under the third child, on the step it was asked on.
      const found: Record<string, string> = {};
      for (const one of result.errors ?? []) {
        const person = party[one.at];
        if (person) found[`${person.key}:${one.fieldId}`] = t(one.message as never);
      }
      if (Object.keys(found).length > 0 && questions.length > 0) {
        setAt(steps.indexOf("questions"));
      }
      setErrors(found);
      setFailed(result.error);
    });
  };

  if (done) {
    const waiting = done.waiting > 0;
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full"
          style={{ background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }}
        >
          <Check className="size-6" />
        </span>
        <h2 className="font-display text-[24px] leading-[30px] text-fg">
          {waiting ? t("publicEvent.doneWaiting") : t("publicEvent.done")}
        </h2>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {waiting
            ? plural("publicEvent.waiting", done.waiting)
            : plural("publicEvent.registered", done.going)}
        </p>
      </div>
    );
  }

  if (state !== "open" && state !== "waitlist") {
    return (
      <Empty
        icon="calendarOff"
        title={
          state === "cancelled"
            ? t("publicEvent.cancelled")
            : state === "full"
              ? t("publicEvent.full")
              : t("publicEvent.closed")
        }
        className="py-6"
      />
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-7" aria-busy={sending}>
      {/* Where they are, and how much is left. Numbered, because a step the
          reader cannot count is a step they cannot judge the length of. */}
      {steps.length > 1 ? (
        <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-caption">
          {steps.map((one, index) => (
            <li key={one} className="flex items-center gap-2.5">
              {index > 0 ? (
                <span aria-hidden className="h-px w-5 bg-line-strong" />
              ) : null}
              <span
                aria-current={one === step ? "step" : undefined}
                className={
                  one === step
                    ? "font-semibold text-fg"
                    : index < at
                      ? "text-fg-muted"
                      : "text-fg-subtle"
                }
              >
                {index + 1}
                {". "}
                {one === "who"
                  ? t("publicEvent.who")
                  : one === "questions"
                    ? t("publicEvent.stepQuestions")
                    : t("publicEvent.stepConfirm")}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {state === "waitlist" ? (
        <Banner tone="info" title={t("publicEvent.waitlistOpen")} />
      ) : null}
      {failed ? <Banner tone="danger" title={t("publicEvent.failed")}>{failed}</Banner> : null}

      {step === "who" ? (
        <div className="flex flex-col gap-4">
          {party.map((person, index) => (
            <div
              key={person.key}
              className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
                  {t("publicEvent.person", { number: index + 1 })}
                </span>
                {party.length > 1 ? (
                  <IconButton
                    label={t("publicEvent.removePerson", { name: calls(person, index) })}
                    onClick={() =>
                      setParty((was) => was.filter((one) => one.key !== person.key))}
                    className="size-7 min-h-0 [&_svg]:size-3.5"
                  >
                    <X />
                  </IconButton>
                ) : null}
              </div>

              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                <Field
                  label={t("publicEvent.name")}
                  required
                  error={errors[`${person.key}:name`]}
                >
                  <Input
                    value={person.name}
                    onChange={(e) => change(person.key, { name: e.target.value })}
                    autoComplete="name"
                  />
                </Field>
                <Field label={t("publicEvent.email")}>
                  <Input
                    type="email"
                    value={person.email}
                    onChange={(e) => change(person.key, { email: e.target.value })}
                    autoComplete="email"
                  />
                </Field>
                <Field label={t("publicEvent.phone")}>
                  <Input
                    type="tel"
                    value={person.phone}
                    onChange={(e) => change(person.key, { phone: e.target.value })}
                    autoComplete="tel"
                  />
                </Field>
              </div>
            </div>
          ))}

          {/* R14.6. A whole family in one go, which is the case this exists for. */}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setParty((was) => [...was, blank()])}
          >
            <Plus className="size-4" aria-hidden /> {t("publicEvent.addPerson")}
          </Button>
        </div>
      ) : null}

      {step === "questions" ? (
        <div className="flex flex-col gap-6">
          {party.map((person, index) => {
            const shown = visibleFields(questions, person.answers);
            return (
              <div
                key={person.key}
                className="flex flex-col gap-5 rounded-[14px] border border-line bg-surface p-5"
              >
                {party.length > 1 ? (
                  <span className="text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
                    {calls(person, index)}
                  </span>
                ) : null}
                {shown.map((field) => (
                  <Answer
                    key={field.id}
                    field={field}
                    value={person.answers[field.id] ?? null}
                    error={errors[`${person.key}:${field.id}`]}
                    onChange={(value) => answer(person.key, field.id, value)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5">
          <span className="text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
            {t("publicEvent.who")}
          </span>
          <ul className="flex flex-col gap-2.5">
            {party.map((person, index) => (
              <li key={person.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium text-fg">{calls(person, index)}</span>
                <span className="text-caption text-fg-muted">
                  {[person.email.trim(), person.phone.trim()].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <input
        ref={trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] size-px opacity-0"
      />

      <div className="flex flex-wrap items-center gap-3">
        {at > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setAt((was) => was - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> {t("publicEvent.previous")}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={sending || (step === "confirm" && preview)}
          className="min-w-[160px]"
        >
          {step === "confirm"
            ? sending
              ? t("publicEvent.registering")
              : t("publicEvent.register")
            : t("publicEvent.continue")}
        </Button>
      </div>
    </form>
  );
}
