"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Checkbox, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { EmailProvider } from "@hearth/db";
import { saveMail, dropMail } from "./actions";

/**
 * R16.1. The church's own mail account.
 *
 * Saving tests first. A church that leaves this screen believing its mail is
 * set up, and finds out three weeks later that nothing went out, has lost three
 * weeks of whatever it was sending.
 */
export function MailForm({
  church,
  current,
}: {
  church: string;
  current: EmailProvider | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [sent, setSent] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const [values, setValues] = React.useState({
    host: current?.host ?? "",
    port: String(current?.port ?? 587),
    secure: current?.secure ?? false,
    username: current?.username ?? "",
    password: "",
    fromEmail: current?.fromEmail ?? "",
    fromName: current?.fromName ?? "",
    replyTo: current?.replyTo ?? "",
  });

  const set = (patch: Partial<typeof values>) => setValues({ ...values, ...patch });

  const submit = () => {
    startTransition(async () => {
      const result = await saveMail(
        {
          host: values.host,
          port: Number(values.port),
          secure: values.secure,
          username: values.username,
          password: values.password || null,
          fromEmail: values.fromEmail,
          fromName: values.fromName || null,
          replyTo: values.replyTo || null,
        },
        church,
      );
      setError(result.error);
      setSent(result.sent);
      if (!result.error) {
        setValues({ ...values, password: "" });
        router.refresh();
      }
    });
  };

  return (
    <Card aria-busy={pending}>
      <CardTitle>{t("mail.provider")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-4">
        {error ? <Banner tone="danger" title={t("mail.failed")}>{error}</Banner> : null}
        {sent ? <Banner tone="success" title={t("mail.sent", { email: sent })} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("mail.host")} required>
            <Input
              value={values.host}
              onChange={(e) => set({ host: e.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field label={t("mail.port")} required>
            <Input
              type="number"
              min={1}
              max={65535}
              value={values.port}
              onChange={(e) => set({ port: e.target.value })}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={values.secure}
            onCheckedChange={(on) => set({ secure: on === true })}
          />
          <span className="text-[length:var(--d-text-body)] text-fg">{t("mail.secure")}</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("mail.username")} required>
            <Input
              value={values.username}
              onChange={(e) => set({ username: e.target.value })}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          {/* Once a password is stored, the field asks for a new one and
              blank keeps the old, so the label is the one that says so. */}
          <Field
            label={current?.hasPassword ? t("mail.passwordNew") : t("mail.password")}
            required={!current?.hasPassword}
          >
            <Input
              type="password"
              value={values.password}
              onChange={(e) => set({ password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("mail.fromEmail")} required>
            <Input
              type="email"
              value={values.fromEmail}
              onChange={(e) => set({ fromEmail: e.target.value })}
              autoComplete="off"
            />
          </Field>

          <Field label={t("mail.fromName")}>
            <Input
              value={values.fromName}
              onChange={(e) => set({ fromName: e.target.value })}
              autoComplete="off"
            />
          </Field>
        </div>

        <Field label={t("mail.replyTo")}>
          <Input
            type="email"
            value={values.replyTo}
            onChange={(e) => set({ replyTo: e.target.value })}
            autoComplete="off"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={pending} onClick={submit}>
            {t("mail.save")}
          </Button>

          {current ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" disabled={pending}>
                  <Trash2 /> {t("mail.remove")}
                </Button>
              </DialogTrigger>
              <DialogContent title={t("mail.removeTitle")} closeLabel={t("common.close")}>
                <p className="text-[length:var(--d-text-body)] text-fg">
                  {t("mail.removeBody")}
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await dropMail(church);
                        setError(result.error);
                        setSent(undefined);
                        if (!result.error) router.refresh();
                      })}
                  >
                    {t("mail.remove")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}

          {current?.verifiedAt ? (
            <span className="text-caption text-fg-muted">
              {t("mail.verified", {
                when: new Date(current.verifiedAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              })}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
