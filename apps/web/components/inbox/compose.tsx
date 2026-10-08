"use client";

import * as React from "react";
import { Combobox, Field } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { whoToWriteTo, type WriteTo } from "@/app/messages/actions";
import { Writer } from "./thread";

/**
 * R16.9. A new message, and who it is for.
 *
 * The office is offered first, because it is what most messages from a member
 * are for. After it comes whoever leads something they are part of, named with
 * the group or team they lead, so "Ruth Adeyemi" is not a stranger on a list.
 *
 * Staff look anybody up instead: answering the church's post means writing to
 * whoever wrote in, and a church of four hundred cannot be scrolled.
 */
export function Compose({
  church,
  churchName,
  lookup,
  onSent,
  to,
  onTo,
}: {
  church: string;
  churchName: string;
  /** Whether the To field is a lookup rather than a list. */
  lookup: boolean;
  onSent: (key: string) => void;
  to: string;
  onTo: (next: string) => void;
}) {
  const [options, setOptions] = React.useState<WriteTo[]>([]);
  const ticket = React.useRef(0);

  React.useEffect(() => {
    if (lookup) return;
    void whoToWriteTo("", church).then(setOptions);
  }, [lookup, church]);

  const look = (query: string) => {
    if (!lookup) return;
    if (query.trim().length < 2) {
      ticket.current++;
      setOptions([]);
      return;
    }
    const mine = ++ticket.current;
    void whoToWriteTo(query, church).then((found) => {
      if (mine !== ticket.current) return;
      setOptions(found);
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3.5 py-3">
        <Field label={t("inbox.to")} required>
          <Combobox
            options={[
              /* Writing to the church is writing to whoever is on this week,
                 which is what a member means by writing to the church. */
              ...(lookup ? [] : [{ value: "office", label: churchName }]),
              ...options.map((one) => ({
                value: one.value,
                label: one.through ? `${one.label} · ${one.through}` : one.label,
              })),
            ]}
            value={to}
            onChange={(next) => onTo(next)}
            onQueryChange={lookup ? look : undefined}
            clearable={false}
            aria-label={t("inbox.to")}
            emptyLabel={lookup ? t("inbox.findSomebody") : t("lists.noneFound")}
            clearLabel={t("common.close")}
          />
        </Field>
      </div>

      <div className="flex-1" />

      {to ? (
        <Writer church={church} to={to} onSent={() => onSent(to)} autoFocus />
      ) : null}
    </div>
  );
}
