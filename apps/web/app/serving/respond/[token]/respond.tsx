"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Banner, Button, Card, Field, Textarea } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { ServingRequest } from "@hearth/db";
import { answer } from "./actions";

/**
 * R10.6. Yes or no, in one press.
 *
 * Declining asks why and does not require it. A church would rather know
 * somebody cannot than know why, and a required box is where people stop.
 */
export function Respond({
  token,
  request,
}: {
  token: string;
  request: ServingRequest;
}) {
  const [current, setCurrent] = React.useState(request);
  const [declining, setDeclining] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const send = (accept: boolean, why: string | null) => {
    startTransition(async () => {
      const result = await answer(token, accept, why);
      setError(result.error);
      if (result.request) {
        setCurrent(result.request);
        setDeclining(false);
        setReason("");
      }
    });
  };

  const answered = current.status !== "pending";

  return (
    <Card className="flex flex-col gap-5 p-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {answered ? (
        <>
          <Banner
            tone={current.status === "accepted" ? "success" : "info"}
            title={current.status === "accepted"
              ? t("respond.accepted")
              : t("respond.declined")}
          />
          <div>
            <Button
              variant="secondary"
              onClick={() => setCurrent({ ...current, status: "pending" })}
            >
              {t("respond.change")}
            </Button>
          </div>
        </>
      ) : declining ? (
        <form
          noValidate
          action={() => send(false, reason)}
          className="flex flex-col gap-4"
        >
          <Field label={t("respond.reason")}>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setDeclining(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="submit" disabled={pending}>{t("respond.send")}</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => setDeclining(true)}>
            <X /> {t("respond.no")}
          </Button>
              <Button disabled={pending} onClick={() => send(true, null)}>
            <Check /> {t("respond.yes")}
          </Button>
        </div>
      )}
    </Card>
  );
}
