"use client";

import * as React from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import {
  Button, DayGrid, IconButton, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import type { Blockout } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { Block, Quiet } from "../timeline";
import { Confirm } from "@/components/confirm";
import { addAway, removeAway } from "../actions";
import { onDayLong } from "../when";
import { shortDate } from "@/lib/dates";

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
  // R24.6. Five is enough to see what is coming. A fortnight away is fourteen
  // rows, and the press under them is what everybody wants next.
  const [all, setAll] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /*
   * R17.7. "Thursday, October 29 to Thursday, November 5" is two weekdays
   * nobody reads and a line that wraps. The weekday is on the day itself and
   * the end of a span is the date alone.
   */
  const span = (one: Blockout) =>
    one.startsOn === one.endsOn
      ? onDayLong(one.startsOn)
      : t("home.awaySpan", { from: shortDate(one.startsOn), to: shortDate(one.endsOn) });

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
    <Block
      icon={<CalendarOff />}
      title={t("home.away")}
    >
      {/* R17.7. The press everybody comes here for, above the list, because a
          member opens this to say they are away rather than to read the days
          they already said. On its own line, so neither it nor the heading
          beside it has to give up its words in a 300px column. */}
      <div className="px-5 pt-2">
        <button
          type="button"
          onClick={() => { setPicked([]); setAdding(true); }}
          className="flex min-h-[var(--d-tap)] cursor-pointer items-center gap-1.5 font-medium text-primary [&_svg]:size-4"
        >
          <Plus aria-hidden /> {t("home.awayAdd")}
        </button>
      </div>

      {dates.length === 0 ? (
        <Quiet>{t("home.awayNone")}</Quiet>
      ) : (
        /* R24.4. The same thread the rest of the portal draws a list with,
           in two pieces so the line crosses the gap between rows. */
        <ol className="m-0 flex list-none flex-col px-5 py-1">
          {(all ? dates : dates.slice(0, 5)).map((one, i, shown) => (
            <li key={one.id} className="flex min-w-0 gap-3">
              <span
                aria-hidden
                className="flex w-2.5 shrink-0 flex-col items-center self-stretch"
              >
                <span className={`h-[19px] w-px ${i === 0 ? "" : "bg-line-strong"}`} />
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span
                  className={`w-px flex-1 ${i === shown.length - 1 ? "" : "bg-line-strong"}`}
                />
              </span>

              {/* The whole span reads: a date cut to "Thursday, October..."
                  is a date nobody can check. */}
              <span className="flex min-w-0 flex-1 items-center gap-2 py-1.5">
                {/* A span of dates is long. Read at the caption size it
                    sits on one line, which is how a list of them is read. */}
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg">
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
                      className="size-[var(--d-tap)] min-h-0 shrink-0 [&_svg]:size-4"
                    >
                      <X />
                    </IconButton>
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      )}

      {dates.length > 5 ? (
        <button
          type="button"
          onClick={() => setAll((was) => !was)}
          className="flex min-h-[var(--d-tap)] cursor-pointer items-center self-start px-5 font-medium text-primary"
        >
          {all ? t("list.showLess") : t("list.showMore", { count: dates.length - 5 })}
        </button>
      ) : null}

      {error ? (
        <p role="status" className="px-5 pb-3 text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}

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
    </Block>
  );
}
