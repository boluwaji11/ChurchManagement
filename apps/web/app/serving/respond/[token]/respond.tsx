"use client";

import * as React from "react";
import { Check, X, Repeat } from "lucide-react";
import { Banner, Button, Card, Field, Textarea } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { ServingRequest } from "@hearth/db";
import { answer, askSwap, dropSwap } from "./actions";

/**
 * R10.6. Yes or no, in one press.
 *
 * Declining asks why and does not require it. A church would rather know
 * somebody cannot than know why, and a required box is where people stop.
 */
export function Respond({
  token,
  request,
  swap,
}: {
  token: string;
  request: ServingRequest;
  swap: string | null;
}) {
  const [current, setCurrent] = React.useState(request);
  const [swapping, setSwapping] = React.useState(swap);
  const [declining, setDeclining] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
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

  const ask = (why: string | null) => {
    startTransition(async () => {
      const result = await askSwap(token, why);
      setError(result.error);
      if (!result.error) {
        setSwapping("open");
        setAsking(false);
        setReason("");
        setCurrent({ ...current, status: "declined", declineReason: why });
      }
    });
  };

  const unask = () => {
    startTransition(async () => {
      const result = await dropSwap(token);
      setError(result.error);
      if (!result.error) {
        setSwapping("withdrawn");
        setCurrent({ ...current, status: "asked" });
      }
    });
  };

  const answered = current.status !== "asked";

  return (
    <Card className="flex flex-col gap-5 p-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {swapping === "open" ? (
        <>
          <Banner tone="info" title={t("respond.swap.asked")} />
          <div>
            <Button variant="secondary" disabled={pending} onClick={unask}>
              {t("respond.swap.withdraw")}
            </Button>
          </div>
        </>
      ) : swapping === "filled" ? (
        <Banner tone="success" title={t("respond.swap.filled")} />
      ) : answered ? (
        <>
          <Banner
            tone={current.status === "accepted" ? "success" : "info"}
            title={current.status === "accepted"
              ? t("respond.accepted")
              : t("respond.declined")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setCurrent({ ...current, status: "asked" })}>
              {t("respond.change")}
            </Button>
            {current.status === "declined" ? (
              <Button variant="ghost" disabled={pending} onClick={() => setAsking(true)}>
                <Repeat /> {t("respond.swap")}
              </Button>
            ) : null}
          </div>
        </>
      ) : asking ? (
        <form noValidate action={() => ask(reason || null)} className="flex flex-col gap-4">
          <Field label={t("respond.reason")}>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{t("respond.swap")}</Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
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
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{t("respond.send")}</Button>
            <Button type="button" variant="ghost" onClick={() => setDeclining(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={pending} onClick={() => send(true, null)}>
            <Check /> {t("respond.yes")}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setDeclining(true)}>
            <X /> {t("respond.no")}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setAsking(true)}>
            <Repeat /> {t("respond.swap")}
          </Button>
        </div>
      )}
    </Card>
  );
}
