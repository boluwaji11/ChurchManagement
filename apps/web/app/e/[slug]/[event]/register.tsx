"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Banner, Button, Field, IconButton, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { visibleFields, type FormAnswer, type FormFieldDef } from "@hearth/db/rules";
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

/**
 * R14.2, R14.6. Taking a place, for somebody with no account.
 *
 * The people come first and the questions sit under each name, rather than a
 * count at the top and the questions on a later step. A parent registering
 * three children needs to say which child is allergic to what, so the answers
 * have to belong to a person by the time they are given.
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
  const [done, setDone] = React.useState<"going" | "waiting" | null>(null);
  const [sending, startTransition] = React.useTransition();
  const trap = React.useRef<HTMLInputElement>(null);

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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
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
        setDone((result.waiting ?? 0) > 0 ? "waiting" : "going");
        return;
      }

      // Keyed by the person they belong to, so an answer missing on the third
      // child shows under the third child.
      const found: Record<string, string> = {};
      for (const one of result.errors ?? []) {
        const person = party[one.at];
        if (person) found[`${person.key}:${one.fieldId}`] = one.message;
      }
      setErrors(found);
      setFailed(result.error);
    });
  };

  if (done) {
    return (
      <Empty
        icon="calendar"
        title={done === "waiting" ? t("publicEvent.doneWaiting") : t("publicEvent.done")}
        className="py-6"
      />
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
    <form noValidate onSubmit={submit} className="flex flex-col gap-6" aria-busy={sending}>
      {state === "waitlist" ? (
        <Banner tone="info" title={t("publicEvent.waitlistOpen")} />
      ) : null}
      {failed ? <Banner tone="danger" title={t("publicEvent.failed")}>{failed}</Banner> : null}

      {party.map((person, at) => {
        const shown = visibleFields(questions, person.answers);
        return (
          <div
            key={person.key}
            className="flex flex-col gap-4 rounded-[14px] border border-line bg-canvas p-5"
          >
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[12px] font-bold tracking-[0.06em] text-fg-subtle uppercase">
                {t("publicEvent.person", { number: at + 1 })}
              </span>
              {party.length > 1 ? (
                <IconButton
                  label={t("publicEvent.removePerson", {
                    name: person.name.trim() || String(at + 1),
                  })}
                  onClick={() => setParty((was) => was.filter((one) => one.key !== person.key))}
                  className="size-7 min-h-0 [&_svg]:size-3.5"
                >
                  <X />
                </IconButton>
              ) : null}
            </div>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <Field label={t("publicEvent.name")} required>
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

            {shown.length > 0 ? (
              <div className="flex flex-col gap-5 border-t border-line pt-4">
                {shown.map((field) => (
                  <Answer
                    key={field.id}
                    field={field}
                    value={person.answers[field.id] ?? null}
                    error={
                      errors[`${person.key}:${field.id}`]
                        ? t(errors[`${person.key}:${field.id}`] as never)
                        : undefined
                    }
                    onChange={(value) => answer(person.key, field.id, value)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* R14.6. A whole family in one go, which is the case this exists for. */}
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        onClick={() => setParty((was) => [...was, blank()])}
      >
        <Plus className="size-4" aria-hidden /> {t("publicEvent.addPerson")}
      </Button>

      <input
        ref={trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] size-px opacity-0"
      />

      <Button
        type="submit"
        disabled={sending || preview}
        className="w-full sm:w-auto sm:min-w-[180px] sm:self-start"
      >
        {sending ? t("publicEvent.registering") : t("publicEvent.register")}
      </Button>
    </form>
  );
}
