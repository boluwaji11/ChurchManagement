"use client";

import * as React from "react";
import { CalendarOff, Plus, X } from "lucide-react";
import {
  Button, DayGrid, IconButton, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Block, Quiet } from "../timeline";
import { Confirm } from "@/components/confirm";
import { addAway, removeAway } from "../actions";

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
/** A stretch of days off, with its dates already written for the reader. */
export interface AwaySpan {
  id: string;
  startsOn: string;
  endsOn: string;
  /** The first day, or the only one, as the church writes a date. */
  from: string;
  /** The last day, where it is a stretch rather than a single day. */
  to: string | null;
}

export function Away({ dates, church }: { dates: AwaySpan[]; church: string }) {
  const [working, start] = React.useTransition();
  const [adding, setAdding] = React.useState(false);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  /** What a stretch is called where it has to go in a sentence. */
  const span = (one: AwaySpan) =>
    one.to ? t("home.awaySpan", { from: one.from, to: one.to }) : one.from;

  /*
   * R10.4. Every day already blocked out, so the calendar does not offer one
   * of them again. A second row for the same day is a row nobody meant.
   */
  const already = React.useMemo(() => {
    const out: string[] = [];
    for (const one of dates) {
      const [y, m, d] = one.startsOn.split("-").map(Number) as [number, number, number];
      const at = new Date(y, m - 1, d);
      for (let guard = 0; guard < 400; guard += 1) {
        const day = [
          at.getFullYear(),
          String(at.getMonth() + 1).padStart(2, "0"),
          String(at.getDate()).padStart(2, "0"),
        ].join("-");
        if (day > one.endsOn) break;
        out.push(day);
        at.setDate(at.getDate() + 1);
      }
    }
    return out;
  }, [dates]);

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
        /* R24.6. Seven rows, then the rest is scrolled to. A member who is
           away a lot has twenty of these, and twenty rows pushes the card
           past the bottom of the screen; a Show more that doubles the card
           does the same thing one press later. */
        <ol className="m-0 flex max-h-[308px] list-none flex-col overflow-y-auto px-5 py-1">
          {dates.map((one, i, shown) => (
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
                {/* The two dates carry the line and the word between them
                    steps back, so a stretch reads as two dates rather than as
                    a sentence to be parsed. */}
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg">
                  {one.from}
                  {one.to ? (
                    <>
                      <span className="px-1 text-fg-subtle">{t("home.awayTo")}</span>
                      {one.to}
                    </>
                  ) : null}
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
            taken={already}
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
              {t("home.awaySave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Block>
  );
}
