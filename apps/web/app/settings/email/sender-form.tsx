"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { saveSender, sendTest, removeSender } from "./actions";

export interface SenderValues {
  provider: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  hasSecret: boolean;
  verifiedAt: string | null;
  lastError: string | null;
}

const PROVIDERS = ["resend", "smtp"] as const;

/**
 * R16.2. The church's own provider, set up by the church.
 *
 * Resend asks for a key. SMTP asks for the account the church already has. The
 * key on file is never sent back to this screen, so an empty key field on an
 * edit means the one already stored stands.
 */
export function SenderForm({
  church,
  values,
  canEdit,
}: {
  church: string;
  values: SenderValues | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState(values?.provider ?? "resend");
  const [error, setError] = React.useState<string>();
  const [sent, setSent] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const smtp = provider === "smtp";

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("email.title")}>{error}</Banner> : null}
      {sent ? (
        <Banner tone="success" title={t("email.title")}>
          {t("email.testSent", { email: sent })}
        </Banner>
      ) : null}

      <Card>
        <CardTitle>{t("email.title")}</CardTitle>
        <Separator className="my-4" />

        <form
          action={(data) => {
            data.set("church", church);
            data.set("provider", provider);
            startTransition(async () => {
              const result = await saveSender(data);
              setError(result.error);
              setSent(undefined);
              if (!result.error) router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("email.provider")}</span>
              <Select value={provider} onValueChange={setProvider} disabled={!canEdit}>
                <SelectTrigger aria-label={t("email.provider")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((name) => (
                    <SelectItem key={name} value={name}>
                      {t(`email.provider.${name}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={smtp ? t("email.password") : t("email.apiKey")}>
              <Input
                name="secret"
                type="password"
                autoComplete="off"
                disabled={!canEdit}
                placeholder={values?.hasSecret ? "********" : undefined}
              />
            </Field>

            <Field label={t("email.fromName")}>
              <Input
                name="fromName"
                defaultValue={values?.fromName ?? ""}
                autoComplete="off"
                disabled={!canEdit}
              />
            </Field>

            <Field label={t("email.fromEmail")}>
              <Input
                name="fromEmail"
                type="email"
                defaultValue={values?.fromEmail ?? ""}
                autoComplete="off"
                disabled={!canEdit}
              />
            </Field>

            <Field label={t("email.replyTo")}>
              <Input
                name="replyTo"
                type="email"
                defaultValue={values?.replyTo ?? ""}
                autoComplete="off"
                disabled={!canEdit}
              />
            </Field>

            {smtp ? (
              <>
                <Field label={t("email.host")}>
                  <Input
                    name="host"
                    defaultValue={values?.host ?? ""}
                    autoComplete="off"
                    disabled={!canEdit}
                  />
                </Field>

                <Field label={t("email.port")}>
                  <Input
                    name="port"
                    inputMode="numeric"
                    defaultValue={values?.port === null || values?.port === undefined ? "587" : String(values.port)}
                    disabled={!canEdit}
                  />
                </Field>

                <Field label={t("email.username")}>
                  <Input
                    name="username"
                    defaultValue={values?.username ?? ""}
                    autoComplete="off"
                    disabled={!canEdit}
                  />
                </Field>
              </>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{t("action.save")}</Button>

              {values ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await sendTest(church);
                      setError(result.error);
                      setSent(result.sentTo);
                      router.refresh();
                    })
                  }
                >
                  <Send /> {t("email.test")}
                </Button>
              ) : null}

              {values ? (
                <RemoveDialog
                  pending={pending}
                  onConfirm={() =>
                    startTransition(async () => {
                      const result = await removeSender(church);
                      setError(result.error);
                      setSent(undefined);
                      if (!result.error) router.refresh();
                    })
                  }
                />
              ) : null}
            </div>
          ) : null}
        </form>
      </Card>

      {values ? (
        <Card className="flex flex-col gap-2">
          <span className="text-[length:var(--d-text-body)] text-fg">
            {values.verifiedAt
              ? t("email.verified", { when: values.verifiedAt })
              : t("email.unverified")}
          </span>
          {values.lastError ? (
            <span className="text-caption text-danger">
              {t("email.failed", { error: values.lastError })}
            </span>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function RemoveDialog({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost"><Trash2 /> {t("email.remove")}</Button>
      </DialogTrigger>
      <DialogContent title={t("email.removeTitle")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("email.removeBody")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {t("email.remove")}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
