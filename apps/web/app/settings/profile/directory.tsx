"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Banner, Switch } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { MessageKey } from "@hearth/i18n";
import { savePrivacy } from "./actions";

export interface PrivacyValues {
  listed: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showBirthday: boolean;
  showPhoto: boolean;
  showChildren: boolean;
}

/** What this person's entry would say, for the panel that shows it. */
export interface PrivacyDetails {
  personId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  /** Day and month only, already written. */
  birthday: string | null;
  children: string | null;
}

type Key = keyof PrivacyValues;

/**
 * R3.2, R3.3. What the church may print about me.
 *
 * Everything starts off. A church that imported this person's phone number has
 * not been given permission to publish it, and this is where that permission is
 * given, one field at a time.
 *
 * Built to docs/redesign/design: a switch per field with what it would publish
 * written under it, and the entry itself beside them, so turning something off
 * shows the entry shrink rather than describing what will happen.
 */
export function DirectoryEntry({
  church,
  values,
  details,
  isHead,
}: {
  church: string;
  values: PrivacyValues;
  details: PrivacyDetails;
  isHead: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [now, setNow] = React.useState(values);
  const [pending, startTransition] = React.useTransition();

  const set = (key: Key, on: boolean) => {
    const next = { ...now, [key]: on };
    setNow(next);
    startTransition(async () => {
      const data = new FormData();
      data.set("church", church);
      for (const [name, value] of Object.entries(next)) {
        if (value) data.set(name, "on");
      }
      const result = await savePrivacy(data);
      setError(result.error);
      if (result.error) setNow(now);
      else router.refresh();
    });
  };

  const rows: Array<{ key: Key; label: MessageKey; said: string | null }> = [
    { key: "showPhoto", label: "privacy.photo", said: null },
    { key: "showEmail", label: "privacy.email", said: details.email },
    { key: "showPhone", label: "privacy.phone", said: details.phone },
    { key: "showAddress", label: "privacy.address", said: details.address },
    { key: "showBirthday", label: "privacy.birthday", said: t("privacy.birthdayWhat") },
    ...(isHead
      ? [{ key: "showChildren" as Key, label: "privacy.children" as MessageKey, said: details.children }]
      : []),
  ];

  // What a member would actually read, which is the point of the panel.
  const shown = rows.filter(
    (row) => now[row.key] && row.key !== "showPhoto" && row.said,
  );

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("privacy.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex flex-[1_1_300px] flex-col rounded-[14px] border border-line bg-surface px-5 py-2">
          <Row
            label={t("privacy.listed")}
            said={t("privacy.listedWhat")}
            on={now.listed}
            disabled={pending}
            onChange={(on) => set("listed", on)}
          />

          {rows.map((row) => (
            <Row
              key={row.key}
              label={t(row.label)}
              said={row.said}
              on={now[row.key]}
              disabled={pending || !now.listed}
              onChange={(on) => set(row.key, on)}
            />
          ))}
        </section>

        <section className="flex flex-[1_1_240px] flex-col gap-2">
          <span className="text-[12px] font-medium text-fg-subtle">{t("privacy.membersSee")}</span>

          <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-[18px]">
            {now.listed ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={details.name}
                    id={details.personId}
                    className={
                      now.showPhoto ? "size-9 text-[13px] font-semibold" : "hidden"
                    }
                  />
                  <span className="font-display text-[19px] text-fg">{details.name}</span>
                </div>

                {shown.map((row) => (
                  <div key={row.key} className="flex justify-between gap-3 text-label">
                    <span className="text-fg-subtle">{t(row.label)}</span>
                    <span className="text-right text-fg">{row.said}</span>
                  </div>
                ))}
              </>
            ) : (
              <span className="text-fg-muted">{t("privacy.notListed")}</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** One switch, with what it would publish written under its name. */
function Row({
  label,
  said,
  on,
  disabled,
  onChange,
}: {
  label: string;
  said: string | null;
  on: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex min-h-13 cursor-pointer items-center gap-3.5 border-b border-sunken py-2.5 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-fg">{label}</span>
        {said ? <span className="truncate text-[12px] text-fg-subtle">{said}</span> : null}
      </span>
      <Switch checked={on} disabled={disabled} onCheckedChange={(next) => onChange(next === true)} />
    </label>
  );
}
