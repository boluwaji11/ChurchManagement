"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserMinus } from "lucide-react";
import {
  Banner, Badge, Button, IconButton, Checkbox, Input, Separator, EmptyState,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { TeamRole } from "@hearth/db";
import {
  addMember, removeMember, changeRole, changePositions, findPerson, type PersonHit,
} from "../actions";

export interface RosterMember {
  id: string;
  personId: string;
  name: string;
  role: string;
  joinedOn: string;
  positions: { id: string; name: string }[];
}

export interface PositionOption {
  id: string;
  name: string;
}

/**
 * R10.1. Who serves on this team, and what each of them plays.
 *
 * Adding somebody is the same search the station and the group roster use,
 * because a church has one directory and a worship leader should not have to
 * learn a second way of finding people in it.
 */
export function Roster({
  church,
  teamId,
  members,
  positions,
}: {
  church: string;
  teamId: string;
  members: RosterMember[];
  positions: PositionOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [role, setRole] = React.useState<TeamRole>("member");
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

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const add = (personId: string) => {
    startTransition(async () => {
      const result = await addMember(teamId, personId, role, church);
      setError(result.error);
      if (!result.error) {
        setQuery("");
        setHits([]);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {members.length === 0 ? (
        <EmptyState title={t("serving.roster.empty")} />
      ) : (
        <ul className="flex flex-col">
          {members.map((member, i) => (
            <li key={member.id}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/people/${member.personId}?church=${church}`}
                    className="text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
                  >
                    {member.name}
                  </Link>
                  {member.role === "leader" ? (
                    <Badge tone="neutral">{t("serving.role.leader")}</Badge>
                  ) : null}
                  {member.positions.map((position) => (
                    <span key={position.id} className="text-caption text-fg-muted">
                      {position.name}
                    </span>
                  ))}
                </span>

                <span className="flex flex-wrap items-center gap-1">
                  {positions.length > 0 ? (
                    <PlaysDialog
                      name={member.name}
                      positions={positions}
                      selected={member.positions.map((p) => p.id)}
                      pending={pending}
                      onSave={(ids) =>
                        run(() => changePositions(teamId, member.id, ids, church))}
                    />
                  ) : null}

                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      run(() => changeRole(teamId, member.id, value as TeamRole, church))}
                  >
                    <SelectTrigger aria-label={t("serving.role")} className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["member", "leader"] as const).map((option) => (
                        <SelectItem key={option} value={option}>
                          {t(`serving.role.${option}` as never)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <IconButton
                    label={t("serving.remove")}
                    variant="ghost"
                    onClick={() => run(() => removeMember(teamId, member.personId, church))}
                  >
                    <UserMinus />
                  </IconButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 items-center gap-2 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-3 shadow-sm transition-colors has-[input:focus-visible]:border-fg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--ring)]">
          <Search className="size-5 shrink-0 text-fg-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("serving.roster.add")}
            autoComplete="off"
            className="border-0 bg-transparent shadow-none outline-none focus-visible:outline-none"
          />
        </div>

        <Select value={role} onValueChange={(value) => setRole(value as TeamRole)}>
          <SelectTrigger aria-label={t("serving.role")} className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["member", "leader"] as const).map((option) => (
              <SelectItem key={option} value={option}>
                {t(`serving.role.${option}` as never)}
              </SelectItem>
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

/** R10.2. Which of the team's positions this person plays. */
function PlaysDialog({
  name,
  positions,
  selected,
  pending,
  onSave,
}: {
  name: string;
  positions: PositionOption[];
  selected: string[];
  pending: boolean;
  onSave: (ids: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [chosen, setChosen] = React.useState<string[]>(selected);

  React.useEffect(() => {
    if (open) setChosen(selected);
  }, [open, selected]);

  const toggle = (id: string, on: boolean) =>
    setChosen((current) => (on ? [...current, id] : current.filter((x) => x !== id)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">{t("serving.plays")}</Button>
      </DialogTrigger>
      <DialogContent title={name} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {positions.map((position) => (
              <label key={position.id} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={chosen.includes(position.id)}
                  onCheckedChange={(on) => toggle(position.id, on === true)}
                />
                <span className="text-[length:var(--d-text-body)] text-fg">{position.name}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onSave(chosen);
              }}
            >
              {t("action.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
