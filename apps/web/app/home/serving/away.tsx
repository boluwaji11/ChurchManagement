"use client";

import * as React from "react";
import { t } from "@connectapp/i18n";
import { Panel } from "@/components/portal/panel";
import { addAway, removeAway } from "../actions";

export interface AwayDay {
  /** The service day, as YYYY-MM-DD. */
  on: string;
  /** How it reads on the pill. */
  label: string;
  /** The blockout covering it, where there is one. */
  blockoutId: string | null;
}

/**
 * R17.7, R10.4. The service days this member has said not to ask.
 *
 * A pill a day rather than a form with two dates on it. A member is answering
 * "which of these can you not do", and the days the church actually meets are
 * the only answers worth offering, so the question is asked as the answers.
 */
export function Away({ days, church }: { days: AwayDay[]; church: string }) {
  const [working, start] = React.useTransition();
  const [now, setNow] = React.useState(days);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { setNow(days); }, [days]);

  const toggle = (day: AwayDay) => {
    const was = now;
    setNow(was.map((one) =>
      one.on === day.on ? { ...one, blockoutId: day.blockoutId ? null : "pending" } : one));

    start(async () => {
      const back = day.blockoutId
        ? await removeAway(day.blockoutId, church)
        : await addAway(day.on, day.on, null, church);
      if (back.error) {
        setNow(was);
        setError(back.error);
      } else {
        setError(null);
      }
    });
  };

  return (
    <Panel className="flex flex-col gap-3">
      <span className="font-semibold text-fg">{t("home.away")}</span>
      <p className="-mt-2 text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNote")}</p>

      {now.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.awayNoDays")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {now.map((day) => {
            const on = Boolean(day.blockoutId);
            return (
              <button
                key={day.on}
                type="button"
                disabled={working}
                aria-pressed={on}
                onClick={() => toggle(days.find((one) => one.on === day.on) ?? day)}
                className={
                  on
                    ? "min-h-9 cursor-pointer rounded-full border border-fg bg-fg px-3.5 text-[14px] font-medium text-canvas disabled:opacity-60"
                    : "min-h-9 cursor-pointer rounded-full border border-line-strong bg-surface px-3.5 text-[14px] font-medium text-fg hover:bg-sunken disabled:opacity-60"
                }
              >
                {day.label}
              </button>
            );
          })}
        </div>
      )}

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
