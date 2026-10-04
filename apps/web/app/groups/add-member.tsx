"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Banner, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { GroupRole } from "@hearth/db";
import { findPerson, join, type PersonHit } from "./actions";

/**
 * R9.4. Putting somebody in a group.
 *
 * The same search the station uses, because a church has one directory and a
 * leader should not have to learn a second way of finding people in it.
 */
export function AddMember({ church, groupId }: { church: string; groupId: string }) {
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

  const add = (personId: string) =>
    startTransition(async () => {
      const result = await join(groupId, personId, role, church);
      setError(result.error);
      if (!result.error) {
        setQuery("");
        setHits([]);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-[38px] min-w-48 flex-1 items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)]">
          <Search className="size-[15px] shrink-0 text-fg-subtle" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("groups.addPerson")}
            aria-label={t("groups.addPerson")}
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-[length:var(--d-text-body)] text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>

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
