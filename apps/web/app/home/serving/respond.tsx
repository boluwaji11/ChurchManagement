"use client";

import * as React from "react";
import { Button, Dialog, DialogContent, DialogFooter, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { answerMine } from "../actions";

/**
 * R17.7. Accept, or say you cannot make it.
 *
 * Two buttons rather than a form: the answer the team lead needs is yes or no,
 * and a reason is what somebody adds when they have one. Declining asks for it
 * because "no" on its own leaves a lead guessing whether to ask again.
 */
export function Respond({ id, church }: { id: string; church: string }) {
  const [working, start] = React.useTransition();
  const [asking, setAsking] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const send = (accept: boolean, why: string | null) =>
    start(async () => {
      const back = await answerMine(id, accept, why, church);
      setError(back.error ?? null);
      if (!back.error) setAsking(false);
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button loading={working} onClick={() => send(true, null)}>
          {t("home.accept")}
        </Button>
        <Button variant="secondary" disabled={working} onClick={() => setAsking(true)}>
          {t("home.decline")}
        </Button>
      </div>

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}

      <Dialog open={asking} onOpenChange={(open) => { if (!open) setAsking(false); }}>
        <DialogContent title={t("home.decline")} closeLabel={t("action.cancel")}>
          <Field label={t("home.declineWhy")}>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("home.declineWhyHint")}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={working} onClick={() => send(false, reason.trim() || null)}>
              {t("home.decline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
