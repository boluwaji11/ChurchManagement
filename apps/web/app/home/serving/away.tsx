"use client";

import * as React from "react";
import { X } from "lucide-react";
import {
  Button, DayGrid, IconButton, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import type { Blockout } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Panel } from "@/components/portal/panel";
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
      <span className="font-semibold text-fg">{t("home.away")}</span>

      {dates.length > 0 ? (
        <div className="flex flex-col divide-y divide-line">
          {dates.map((one) => (
            <span key={one.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                {span(one)}
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
        </div>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNone")}</p>
      )}

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}

      <Button
        variant="secondary"
        className="self-start"
        onClick={() => { setPicked([]); setAdding(true); }}
      >
        {t("home.awayAdd")}
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
