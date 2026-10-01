"use client";

import * as React from "react";
import {useRouter } from "next/navigation";
import { Search, UserMinus } from "lucide-react";
import {
  Banner,
  Badge, Button, Input, Separator,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { GroupRole } from "@hearth/db";
import { findPerson, join, leave, type PersonHit } from "./actions";

export interface RosterEntry {
  personId: string;
  name: string;
  role: string;
  joinedOn: string;
  leftOn: string | null;
}

/**
 * R9.4. Who is in the group.
 *
 * Adding somebody is the same search the station uses, because a church has one
 * directory and a leader should not have to learn a second way of finding
 * people in it.
 */
export function Roster({
  church,
  groupId,
  entries,
}: {
  church: string;
  groupId: string;
  entries: RosterEntry[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [role, setRole] = React.useState<GroupRole>("member");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      startTransition(async () => setHits(await findPerson(query, church)));
    }, 120);
    return () => clearTimeout(timer);
  }, [query, church]);

  const add = (personId: string) => {
    startTransition(async () => {
      const result = await join(groupId, personId, role, church);
      setError(result.error);
      if (!result.error) {
        setQuery("");
        setHits([]);
        router.refresh();
      }
    });
  };

  const take = (personId: string) => {
    startTransition(async () => {
      const result = await leave(groupId, personId, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      <ul className="flex flex-col">
        {entries.map((entry, i) => (
          <li key={entry.personId}>
            {i > 0 ? <Separator className="my-2" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-[length:var(--d-text-body)] text-fg">{entry.name}</span>
                {entry.role === "member" ? null : (
                  <Badge tone="neutral">{t(`groups.role.${entry.role}` as never)}</Badge>
                )}
              </span>
              <Button variant="ghost" onClick={() => take(entry.personId)}>
                <UserMinus /> {t("groups.remove")}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus-visible]:border-fg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--ring)]">
          <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("groups.addPerson")}
            autoComplete="off"
            className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
          />
        </div>

        <Select value={role} onValueChange={(value) => setRole(value as GroupRole)}>
          <SelectTrigger aria-label={t("groups.role")} className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["member", "leader", "coleader"] as const).map((r) => (
              <SelectItem key={r} value={r}>{t(`groups.role.${r}` as never)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hits.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => add(hit.id)}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--d-radius-control)] px-3 py-2 text-left hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <span className="text-[length:var(--d-text-body)] text-fg">{hit.name}</span>
                {hit.household ? (
                  <span className="text-caption text-fg-muted">{hit.household}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
