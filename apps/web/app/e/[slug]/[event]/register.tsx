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
import type { Registrant } from "@hearth/db";

/** An answer as the confirmation step reads it back. */
function said(value: FormAnswer): string {
  if (value === true) return t("common.yes");
  if (value === false || value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).trim();
}

/** What either way of sending a registration answers with. */
interface SendResult {
  ok: boolean;
  going?: number;
  waiting?: number;
  errors?: { at: number; fieldId: string; message: string }[];
  error?: string;
}

interface Person {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  answers: Record<string, FormAnswer>;
}

const blank = (): Person => ({
  key: Math.random().toString(36).slice(2),
  firstName: "",
  lastName: "",
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
  formSlug,
  onTrial,
}: {
  churchSlug: string;
  eventSlug: string;
  today: string;
  state: "none" | "open" | "waitlist" | "full" | "closed" | "cancelled";
  questions: FormFieldDef[];
  /** R4.1. The form behind the questions, so a file question can reach it. */
  formSlug?: string | null;
  /**
   * R14.2. Where a preview sends its places instead.
   *
   * The church's own preview books for real against the draft, flagged as a
   * trial and cleared when the event is published, so what gets tried is the
   * whole path rather than a drawing of it.
   */
  onTrial?: (party: Registrant[]) => Promise<SendResult>;
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
    [person.firstName.trim(), person.lastName.trim()].filter(Boolean).join(" ")
    || t("publicEvent.person", { number: index + 1 });

  /**
   * Each step is checked before it is left, so an answer is corrected where it
   * was given rather than three screens later.
   */
  const ready = (which: Step): boolean => {
    const found: Record<string, string> = {};

    if (which === "who") {
      for (const person of party) {
        if (!person.firstName.trim()) {
          found[`${person.key}:firstName`] = t("publicEvent.nameRequired");
        }
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
    setFailed(undefined);
    setErrors({});

    startTransition(async () => {
      const going: Registrant[] = party.map((one) => ({
        firstName: one.firstName,
        lastName: one.lastName,
        email: one.email,
        phone: one.phone,
        answers: one.answers,
      }));

      const result = onTrial
        ? await onTrial(going)
        : await registerParty({
            churchSlug,
            eventSlug,
            today,
            party: going,
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
                  label={t("publicEvent.firstName")}
                  required
                  error={errors[`${person.key}:firstName`]}
                >
                  <Input
                    value={person.firstName}
                    onChange={(e) => change(person.key, { firstName: e.target.value })}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label={t("publicEvent.lastName")}>
                  <Input
                    value={person.lastName}
                    onChange={(e) => change(person.key, { lastName: e.target.value })}
                    autoComplete="family-name"
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
                    churchSlug={churchSlug}
                    formSlug={formSlug ?? undefined}
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
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
          <span className="text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
            {questions.length > 0 ? t("publicEvent.summary") : t("publicEvent.who")}
          </span>

          {/* Everything that is about to be sent, person by person, read back
              in one voice: what they gave about themselves and what they
              answered are the same kind of thing to somebody checking it. */}
          <ul className="flex flex-col gap-4">
            {party.map((person, index) => {
              const lines: { key: string; label: string; said: string }[] = [
                { key: "email", label: t("publicEvent.email"), said: person.email.trim() },
                { key: "phone", label: t("publicEvent.phone"), said: person.phone.trim() },
                ...visibleFields(questions, person.answers)
                  .filter((field) => field.kind !== "section")
                  .map((field) => ({
                    key: field.id,
                    label: field.label,
                    said: said(person.answers[field.id] ?? null),
                  })),
              ].filter((one) => one.said !== "");

              return (
                <li
                  key={person.key}
                  className="flex flex-col gap-1.5 border-b border-line pb-4 last:border-b-0 last:pb-0"
                >
                  <span className="font-medium text-fg">{calls(person, index)}</span>

                  {lines.length > 0 ? (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-[length:var(--d-text-body)]">
                      {lines.map((one) => (
                        <React.Fragment key={one.key}>
                          <dt className="text-fg-muted">{one.label}</dt>
                          <dd className="text-fg">{one.said}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  ) : null}
                </li>
              );
            })}
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

      {/* At the end of the line, where the eye lands after reading the step. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {at > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setAt((was) => was - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> {t("publicEvent.previous")}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={sending}
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
