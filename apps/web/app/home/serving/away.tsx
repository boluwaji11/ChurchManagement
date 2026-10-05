"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  Button, Card, DatePicker, Field, IconButton, Input,
  Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import type { Blockout } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { addAway, removeAway } from "../actions";
import { onDayLong } from "../when";

/** The date picker's words, said once rather than at every call. */
const DATE_LABELS = () => ({
  open: t("date.open"),
  clear: t("date.clear"),
  previousMonth: t("date.previousMonth"),
  nextMonth: t("date.nextMonth"),
  month: t("date.month"),
  year: t("date.year"),
  today: t("date.today"),
});

/**
 * R17.7, R10.4. The days this member has said not to ask.
 *
 * A stretch rather than a list of single days, because somebody away for a
 * fortnight should say it once.
 */
export function Away({ dates, church }: { dates: Blockout[]; church: string }) {
  const [working, start] = React.useTransition();
  const [adding, setAdding] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [why, setWhy] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const span = (one: Blockout) =>
    one.startsOn === one.endsOn
      ? onDayLong(one.startsOn)
      : `${onDayLong(one.startsOn)} to ${onDayLong(one.endsOn)}`;

  const save = () =>
    start(async () => {
      if (!from) return;
      const back = await addAway(from, to || from, why.trim() || null, church);
      setError(back.error ?? null);
      if (!back.error) {
        setAdding(false);
        setFrom("");
        setTo("");
        setWhy("");
      }
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-fg">{t("home.away")}</h2>
      <p className="-mt-1 text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNote")}</p>

      {dates.length > 0 ? (
        <Card className="flex flex-col divide-y divide-line p-0">
          {dates.map((one) => (
            <span key={one.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[length:var(--d-text-body)] text-fg">
                  {span(one)}
                </span>
                {one.reason ? (
                  <span className="truncate text-caption text-fg-muted">{one.reason}</span>
                ) : null}
              </span>
              <IconButton
                label={t("home.awayRemove", { dates: span(one) })}
                variant="ghost"
                disabled={working}
                className="size-8 min-h-0 shrink-0 [&_svg]:size-4"
                onClick={() => start(async () => {
                  const back = await removeAway(one.id, church);
                  setError(back.error ?? null);
                })}
              >
                <X />
              </IconButton>
            </span>
          ))}
        </Card>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNone")}</p>
      )}

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}

      <div>
        <Button variant="secondary" onClick={() => setAdding(true)}>{t("home.awayAdd")}</Button>
      </div>

      <Dialog open={adding} onOpenChange={(open) => { if (!open) setAdding(false); }}>
        <DialogContent title={t("home.awayAdd")} closeLabel={t("action.cancel")}>
          <Field label={t("home.awayFrom")} required>
            <DatePicker value={from} onChange={setFrom} labels={DATE_LABELS()} />
          </Field>
          <Field label={t("home.awayTo")}>
            <DatePicker value={to} onChange={setTo} labels={DATE_LABELS()} />
          </Field>
          <Field label={t("home.awayWhy")}>
            <Input value={why} onChange={(e) => setWhy(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={working} disabled={!from} onClick={save}>
              {t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
