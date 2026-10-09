"use client";

import * as React from "react";
import {
  Combobox, Field,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { kindsICanWriteTo, whoToWriteTo, type WriteKind, type WriteTo } from "@/app/messages/actions";
import { Writer } from "./thread";

/**
 * R16.9. A new message, and who it is for.
 *
 * Asked in two steps: what kind of thing it is going to, then which one. A
 * church keeps three different lists, and one box holding all of them made
 * the office scroll past every group to reach a name.
 *
 * Each list is what this reader may reach. The office looks anybody up and
 * writes to any group or team. A member reaches the church, the groups and
 * teams they are in, and whoever leads one of them.
 */
export function Compose({
  church,
  churchName,
  onSent,
  to,
  onTo,
}: {
  church: string;
  churchName: string;
  onSent: (key: string) => void;
  to: string;
  onTo: (next: string) => void;
}) {
  const [kinds, setKinds] = React.useState<WriteKind[]>([]);
  const [kind, setKind] = React.useState<WriteKind | null>(null);
  const [options, setOptions] = React.useState<WriteTo[]>([]);
  const ticket = React.useRef(0);

  React.useEffect(() => {
    void kindsICanWriteTo(church).then((found) => {
      setKinds(found);
      setKind((was) => was ?? found[0] ?? null);
    });
  }, [church]);

  /* The list behind the kind. Only people are looked up by typing; a church
     has few enough groups and teams to read. */
  React.useEffect(() => {
    if (!kind || kind === "church") { setOptions([]); return; }
    if (kind === "member") { setOptions([]); return; }
    const mine = ++ticket.current;
    void whoToWriteTo(kind, "", church).then((found) => {
      if (mine === ticket.current) setOptions(found);
    });
  }, [kind, church]);

  const look = (query: string) => {
    if (kind !== "member") return;
    const mine = ++ticket.current;
    void whoToWriteTo("member", query, church).then((found) => {
      if (mine === ticket.current) setOptions(found);
    });
  };

  React.useEffect(() => {
    /* Writing to the church is one choice, so it needs no second list. */
    if (kind === "church") onTo("office");
    else onTo("");
    // The caller owns the address; this only clears it when the kind changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const LABEL: Record<WriteKind, string> = {
    church: churchName,
    member: t("inbox.kind.member"),
    group: t("inbox.kind.group"),
    team: t("inbox.kind.team"),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-3.5 py-3">
        <Field label={t("inbox.to")} required>
          <Select
            value={kind ?? ""}
            onValueChange={(next) => setKind(next as WriteKind)}
          >
            <SelectTrigger aria-label={t("inbox.to")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {kinds.map((one) => (
                <SelectItem key={one} value={one}>{LABEL[one]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {kind && kind !== "church" ? (
          <Field label={LABEL[kind]} required>
            <Combobox
              options={options.map((one) => ({
                value: one.value,
                label: one.through ? `${one.label} · ${one.through}` : one.label,
              }))}
              value={to}
              onChange={onTo}
              onQueryChange={kind === "member" ? look : undefined}
              clearable={false}
              aria-label={LABEL[kind]}
              emptyLabel={kind === "member" ? t("inbox.findSomebody") : t("lists.noneFound")}
              clearLabel={t("common.close")}
            />
          </Field>
        ) : null}
      </div>

      <div className="flex-1" />

      {to ? <Writer church={church} to={to} onSent={() => onSent(to)} autoFocus /> : null}
    </div>
  );
}
