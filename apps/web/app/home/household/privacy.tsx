"use client";

import * as React from "react";
import { Card, Switch } from "@connectapp/ui";
import type { Visibility } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { setMyPrivacy } from "../actions";

/** Every field a member can publish, in the order the design reads them. */
const FIELDS = [
  ["listed", "home.listed"],
  ["showPhone", "home.showPhone"],
  ["showEmail", "home.showEmail"],
  ["showAddress", "home.showAddress"],
  ["showBirthday", "home.showBirthday"],
  ["showPhoto", "home.showPhoto"],
  ["showChildren", "home.showChildren"],
] as const;

/**
 * R17.3, R3.2. What the church directory shows of this member.
 *
 * Switched here rather than asked for on a form, because it is read as a list
 * of yes and no and changed one line at a time. Each switch saves on its own:
 * there is no Save on a screen where every control is already an answer.
 *
 * Taking yourself out of the directory does not take you out of the church's
 * records, which is what the line under the heading says.
 */
export function Privacy({
  value,
  shown,
  church,
}: {
  value: Visibility;
  /** What each field actually holds, so a switch is not flipped blind. */
  shown: Partial<Record<keyof Visibility, string>>;
  church: string;
}) {
  const [now, setNow] = React.useState(value);
  const [working, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const flip = (key: keyof Visibility, on: boolean) => {
    const was = now;
    setNow({ ...was, [key]: on });
    start(async () => {
      const back = await setMyPrivacy({ [key]: on }, church);
      if (back.error) {
        setNow(was);
        setError(back.error);
      } else {
        setError(null);
      }
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-heading text-fg">{t("home.shows")}</h2>
      <p className="-mt-1 text-[length:var(--d-text-body)] text-fg-muted">{t("home.showsNote")}</p>

      <Card className="flex flex-col divide-y divide-line p-0">
        {FIELDS.map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-3 px-4 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[length:var(--d-text-body)] font-medium text-fg">
                {t(label)}
              </span>
              {shown[key] ? (
                <span className="truncate text-caption text-fg-muted">{shown[key]}</span>
              ) : null}
            </span>
            <Switch
              checked={now[key]}
              disabled={working}
              onCheckedChange={(on) => flip(key, on)}
              aria-label={t(label)}
            />
          </label>
        ))}
      </Card>

      {error ? (
        <p role="status" className="text-[length:var(--d-text-body)] text-danger-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}
