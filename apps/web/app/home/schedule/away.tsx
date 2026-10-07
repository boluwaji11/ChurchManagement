"use client";

import * as React from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import {
  Button, DayGrid, IconButton, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import type { Blockout } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Panel } from "@/components/portal/panel";
import { Confirm } from "@/components/confirm";
import { addAway, removeAway } from "../actions";
import { onDayLong } from "../when";

/**
 * R17.7, R10.4. The days this member has said they cannot serve.
 *
 * Added on a calendar with as many days chosen as they like, because somebody
 * marking the weekends they are away is answering one question and should not
 * open a dialog five times to answer it.
 *
 * The scheduler sees these the moment they are saved: putting somebody down on
 * a day they have blocked warns, and going ahead anyway is recorded on the
 * assignment.
 */
export function Away({ dates, church }: { dates: Blockout[]; church: string }) {
  const [working, start] = React.useTransition();
  const [adding, setAdding] = React.useState(false);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const span = (one: Blockout) =>
    one.startsOn === one.endsOn
      ? onDayLong(one.startsOn)
      : t("home.awaySpan", { from: onDayLong(one.startsOn), to: onDayLong(one.endsOn) });

  const save = () =>
    start(async () => {
      for (const day of picked) {
        const back = await addAway(day, day, null, church);
        if (back.error) {
          setError(back.error);
          return;
        }
      }
      setError(null);
      setPicked([]);
      setAdding(false);
    });

  return (
    <Panel className="flex flex-col gap-3">
      {/* R24.6. The calendar sits with the name, where the eye lands first. */}
      <span className="flex items-start justify-between gap-3">
        <span className="font-semibold text-fg">{t("home.away")}</span>
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary"
        >
          <CalendarOff className="size-[18px]" />
        </span>
      </span>

      {dates.length > 0 ? (
        /* R24.6. The connected path the rest of the product draws its lists
           with: a marker a row, the line between them carrying its own dot. */
        <ol className="m-0 flex list-none flex-col p-0">
          {dates.map((one, i) => (
            <li key={one.id} className="flex gap-2.5">
              <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                <span className="mt-3 size-2.5 shrink-0 rounded-full bg-primary" />
                {i === dates.length - 1 ? null : (
                  <span className="relative my-1 w-px flex-1 bg-primary/35">
                    <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/60" />
                  </span>
                )}
              </span>

              <span className="flex min-w-0 flex-1 items-center gap-2 pb-2">
                <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                  {span(one)}
                </span>
                <Confirm
                  title={t("home.awayRemoveTitle", { dates: span(one) })}
                  confirmLabel={t("home.awayRemoveAction")}
                  disabled={working}
                  onConfirm={() => start(async () => {
                    const back = await removeAway(one.id, church);
                    setError(back.error ?? null);
                  })}
                  trigger={
                    <IconButton
                      label={t("home.awayRemove", { dates: span(one) })}
                      variant="ghost"
                      disabled={working}
                      className="size-8 min-h-0 shrink-0 [&_svg]:size-4"
                    >
                      <X />
                    </IconButton>
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNone")}</p>
      )}

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}

      <Button
        variant="ghost"
        className="self-start px-2 font-medium text-primary"
        onClick={() => { setPicked([]); setAdding(true); }}
      >
        <Plus /> {t("home.awayAdd")}
      </Button>

      <Dialog open={adding} onOpenChange={(open) => { if (!open) setAdding(false); }}>
        <DialogContent title={t("home.awayAdd")} closeLabel={t("action.cancel")}>
          <DayGrid
            value={picked}
            onChange={setPicked}
            labels={{
              previousMonth: t("date.previousMonth"),
              nextMonth: t("date.nextMonth"),
            }}
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={working} disabled={picked.length === 0} onClick={save}>
              {t("home.awaySave", { count: String(picked.length) })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
