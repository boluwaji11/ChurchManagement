"use client";

import * as React from "react";
import { Check, KeyRound, Mail } from "lucide-react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Said } from "@/components/said";
import { SettingCard } from "../card";
import { changeEmail, changePassword, emailMeALink } from "./actions";
import { useFormError } from "@/lib/form-error";
import { useAnswered } from "@/components/form-actions";

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
  icon,
  title,
  value,
  open,
  onToggle,
  children,
}: {
  /** The mark that says which kind of thing this row changes. */
  icon: React.ReactNode;
  title: string;
  /** What it is set to now, read without opening anything. */
  value?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <SettingCard
      icon={icon}
      title={title}
      lede={value}
      onPress={onToggle}
      expanded={open}
    >
      {open ? children : undefined}
    </SettingCard>
  );
}

export function Security({ email }: { email: string }) {
  const [open, setOpen] = React.useState<"email" | "password" | null>(null);
  const [error, setError] = useFormError(open);
  const [message, setMessage] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  /* Which of the three was pressed, so the other two stay as they are. */
  const [doing, setDoing] = React.useState<string>();

  const emailForm = React.useId();
  const passwordForm = React.useId();
  const emailFull = useAnswered(emailForm, open === "email");
  const passwordFull = useAnswered(passwordForm, open === "password");

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  const run = (key: string, work: () => Promise<{ error?: string }>, said: string) => {
    setDoing(key);
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
  };

  const toggle = (which: "email" | "password") => {
    setError(undefined);
    setMessage(undefined);
    setOpen((was) => (was === which ? null : which));
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("settings.tab.security")}>{error}</Banner> : null}
      <Said message={message} onClose={() => setMessage(undefined)} />

      <Row
        icon={<Mail />}
        title={t("email.row")}
        value={email}
        open={open === "email"}
        onToggle={() => toggle("email")}
      >
        <form
          id={emailForm}
          noValidate
          action={(data) => run("email", () => changeEmail(data), t("email.sent"))}
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
          <Button type="submit" loading={doing === "email"} disabled={pending || !emailFull}>
            <Check /> {t("email.change")}
          </Button>
        </form>
      </Row>

      <Row
        icon={<KeyRound />}
        title={t("password.row")}
        open={open === "password"}
        onToggle={() => toggle("password")}
      >
        <form
          id={passwordForm}
          noValidate
          action={(data) => run("password", () => changePassword(data), t("password.changed"))}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
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
              loading={doing === "link"}
              disabled={pending}
              onClick={() => run("link", emailMeALink, t("signUp.sent.title"))}
            >
              <Mail /> {t("password.sendLink")}
            </Button>
            <Button type="submit" loading={doing === "password"} disabled={pending || !passwordFull}>
              <KeyRound /> {t("password.change")}
            </Button>
          </div>
        </form>
      </Row>
    </div>
  );
}
