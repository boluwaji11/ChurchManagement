"use client";

import * as React from "react";
import { Check, ChevronRight, KeyRound, Mail } from "lucide-react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { changeEmail, changePassword, emailMeALink } from "./actions";

/**
 * R1.8. The two things somebody changes about how they get in.
 *
 * Both are shut until they are asked for. A screen that opens with a password
 * box and an email box on it reads as a form to fill in, and this is a screen
 * most members open to check something rather than to change it.
 *
 * Both ask for the current password. Supabase will take either change on the
 * strength of an open session, and an open session is a laptop somebody walked
 * away from.
 */
function Row({
  title,
  value,
  open,
  onToggle,
  children,
}: {
  title: string;
  /** What it is set to now, read without opening anything. */
  value?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left hover:bg-sunken"
      >
        <span className="flex min-w-0 flex-1 flex-col leading-5">
          <span className="text-[15px] font-bold text-fg">{title}</span>
          {value ? <span className="truncate text-[13px] text-fg-muted">{value}</span> : null}
        </span>
        <ChevronRight
          className={`size-4 shrink-0 text-fg-subtle transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {open ? <div className="border-t border-line px-5 py-4">{children}</div> : null}
    </section>
  );
}

export function Security({ email }: { email: string }) {
  const [open, setOpen] = React.useState<"email" | "password" | null>(null);
  const [error, setError] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>, said: string) =>
    startTransition(async () => {
      setError(undefined);
      setMessage(undefined);
      const result = await work();
      setError(result.error);
      if (!result.error) {
        setMessage(said);
        setOpen(null);
      }
    });

  const toggle = (which: "email" | "password") => {
    setError(undefined);
    setMessage(undefined);
    setOpen((was) => (was === which ? null : which));
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("settings.tab.security")}>{error}</Banner> : null}
      {message ? <Banner tone="success" title={message} /> : null}

      <Row
        title={t("email.row")}
        value={email}
        open={open === "email"}
        onToggle={() => toggle("email")}
      >
        <form
          noValidate
          action={(data) => run(() => changeEmail(data), t("email.sent"))}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-56 flex-1">
            <Field label={t("email.new")} required>
              <Input name="email" type="email" autoComplete="email" autoFocus />
            </Field>
          </div>
          <div className="min-w-48 flex-1">
            <Field label={t("email.password")} required>
              <Input name="password" type="password" autoComplete="current-password" />
            </Field>
          </div>
          <Button type="submit" disabled={pending}>
            <Check /> {t("email.change")}
          </Button>
        </form>
      </Row>

      <Row title={t("password.row")} open={open === "password"} onToggle={() => toggle("password")}>
        <form
          noValidate
          action={(data) => run(() => changePassword(data), t("password.changed"))}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <Field label={t("password.current")} required>
              <Input name="current" type="password" autoComplete="current-password" autoFocus />
            </Field>
            <Field label={t("password.new")} required>
              <Input name="next" type="password" autoComplete="new-password" />
            </Field>
            <Field label={t("password.confirm")} required>
              <Input name="confirm" type="password" autoComplete="new-password" />
            </Field>
          </div>

          {/* These appear once on the screen rather than on every row of a
              list, so they keep their words. */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {/* R1.8. Somebody who has only ever signed in by an email link has
                no current password to give, so they ask for one instead. */}
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => run(emailMeALink, t("signUp.sent.title"))}
            >
              <Mail /> {t("password.sendLink")}
            </Button>
            <Button type="submit" disabled={pending}>
              <KeyRound /> {t("password.change")}
            </Button>
          </div>
        </form>
      </Row>
    </div>
  );
}
