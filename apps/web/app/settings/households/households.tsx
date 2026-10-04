"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Merge, Pencil, Plus, Undo2, X } from "lucide-react";
import {
  Avatar, Banner, Button, Field, IconButton, Input,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { householdRoleOptions } from "@/lib/person-input";
import { Empty } from "@/components/empty";
import { SearchField } from "@/components/search-field";
import { add, setName, setRole, putAway, fold, freePeople, putIn, takeOut } from "./actions";

export interface HouseholdItem {
  id: string;
  name: string;
  members: { id: string; name: string; role: string }[];
  archived: boolean;
}

/**
 * R2.1. Every household, and what a church can do with one.
 *
 * A household used to exist only as a side effect of editing a person, which
 * left a church with no way to see a family, rename it, or put two halves of
 * the same one back together.
 */
export function HouseholdList({
  church,
  households,
}: {
  church: string;
  households: HouseholdItem[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [find, setFind] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  // A church with forty families looks for one by its name, or by the name of
  // somebody in it, which is how a volunteer actually remembers a household.
  const needle = find.trim().toLowerCase();
  const matches = (one: HouseholdItem) =>
    !needle ||
    one.name.toLowerCase().includes(needle) ||
    one.members.some((m) => m.name.toLowerCase().includes(needle));

  const open = households.filter((one) => !one.archived && matches(one));
  const archived = households.filter((one) => one.archived && matches(one));

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("households.failed")}>{error}</Banner> : null}

      <SearchField
        value={find}
        onChange={setFind}
        placeholder={t("households.search")}
      />

      {open.length === 0 && archived.length === 0 ? (
        <Empty icon="noResults" title={t("households.noResults")} />
      ) : null}

      {open.length > 0 ? (
        <section className="flex flex-col gap-3">
          {open.map((household) => (
            <article
              key={household.id}
              className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-3 border-b border-sunken pb-3">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
                  {household.name}
                </h3>

                <div className="flex shrink-0 items-center gap-0.5">
                  <EditHousehold household={household} pending={pending} run={run} church={church} />
                  <MergeInto
                    household={household}
                    others={households.filter((one) => !one.archived && one.id !== household.id)}
                    pending={pending}
                    run={run}
                    church={church}
                  />
                  <ArchiveOne household={household} pending={pending} run={run} church={church} />
                </div>
              </div>

              {household.members.length === 0 ? (
                <p className="text-[13px] text-fg-subtle">{t("households.nobody")}</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {household.members.map((member) => (
                    <li key={member.id}>
                      <Link
                        href={`/people/${member.id}?church=${church}`}
                        className="flex items-center gap-2 rounded-full bg-sunken py-1 pr-3 pl-1 hover:brightness-95"
                      >
                        <Avatar
                          name={member.name}
                          id={member.id}
                          className="size-6 text-[10px] font-semibold"
                        />
                        <span className="text-[13px] font-medium text-fg">{member.name}</span>
                        <span className="text-[12px] text-fg-subtle">
                          {t(`householdRole.${member.role}` as never)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {archived.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-fg-subtle">
            {t("households.archived")}
          </span>

          <div className="rounded-[14px] border border-line bg-surface px-5 py-1">
            {archived.map((household) => (
              <div
                key={household.id}
                className="flex items-center gap-3 border-b border-sunken py-2.5 last:border-0"
              >
                <span className="flex-1 text-fg-subtle">{household.name}</span>
                <IconButton
                  label={t("households.restore", { name: household.name })}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => putAway(household.id, false, church))}
                >
                  <Undo2 />
                </IconButton>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * R2.1. A household: its name, and who is in it.
 *
 * The pencil opens the family rather than a single text box, because renaming
 * is rarely why somebody came here. Adding offers only people in no household,
 * since somebody lives in one at a time and offering a name already in another
 * is offering a mistake.
 */
function EditHousehold({
  church,
  household,
  pending,
  run,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName_] = React.useState(household.name);
  const [find, setFind] = React.useState("");
  const [free, setFree] = React.useState<{ id: string; name: string }[]>([]);
  const [looking, setLooking] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName_(household.name);
      setFind("");
    }
  }, [open, household.name]);

  // Searched on the server rather than filtered here: a church of 500 is not a
  // list to ship to the browser so a box can match six characters against it.
  React.useEffect(() => {
    // Nothing until somebody types. A church of 500 opening this box should see
    // the family it came for, not four hundred names it has to scroll past.
    if (!open || find.trim().length < 2) {
      setFree([]);
      return;
    }

    let live = true;
    setLooking(true);
    const timer = setTimeout(async () => {
      const rows = await freePeople(find, church);
      if (live) {
        setFree(rows);
        setLooking(false);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, find, church, household.members.length]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("households.edit", { name: household.name })}
          variant="ghost"
          disabled={pending}
        >
          <Pencil />
        </IconButton>
      </DialogTrigger>

      <DialogContent title={household.name} closeLabel={t("common.close")} className="max-w-xl">
        <div className="flex flex-col gap-5">
          <Field label={t("households.name")} required>
            <Input
              value={name}
              onChange={(e) => setName_(e.target.value)}
              onBlur={() => {
                if (name.trim() && name.trim() !== household.name) {
                  run(() => setName(household.id, name, church));
                }
              }}
              autoComplete="off"
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("households.people")}</span>

            {household.members.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">{t("households.nobody")}</p>
            ) : (
              <ul className="flex flex-col">
                {household.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2.5 border-b border-sunken py-2 last:border-0"
                  >
                    <Avatar
                      name={member.name}
                      id={member.id}
                      className="size-7 text-[11px] font-semibold"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">
                      {member.name}
                    </span>

                    <Select
                      value={member.role}
                      onValueChange={(next) =>
                        run(() => setRole(household.id, member.id, next, church))
                      }
                    >
                      <SelectTrigger
                        aria-label={t("personForm.householdRole")}
                        className="w-36 shrink-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {householdRoleOptions().map((one) => (
                          <SelectItem key={one.value} value={one.value}>{one.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <TakeOut
                      church={church}
                      household={household}
                      member={member}
                      pending={pending}
                      run={run}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("households.addPerson")}</span>

            <SearchField
              value={find}
              onChange={setFind}
              placeholder={t("households.addPersonSearch")}
            />

            {find.trim().length < 2 ? (
              <p className="text-[13px] text-fg-subtle">{t("households.addPersonHint")}</p>
            ) : looking ? null : free.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">{t("households.addPersonNone")}</p>
            ) : (
              <ul className="flex max-h-56 flex-col overflow-auto">
                {free.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => putIn(household.id, person.id, church))}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1 py-2 text-left hover:bg-sunken"
                    >
                      <Avatar
                        name={person.name}
                        id={person.id}
                        className="size-7 text-[11px] font-semibold"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-fg">
                        {person.name}
                      </span>
                      <Plus className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** R2.1. Taking somebody out asks first: it is a change to two records. */
function TakeOut({
  church,
  household,
  member,
  pending,
  run,
}: {
  church: string;
  household: HouseholdItem;
  member: HouseholdItem["members"][number];
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("households.remove", { name: member.name })}
          variant="ghost"
          disabled={pending}
        >
          <X />
        </IconButton>
      </DialogTrigger>

      <DialogContent
        alert
        title={t("households.removeTitle", { name: member.name, household: household.name })}
      >
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("households.removeBody")}
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("households.keep")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              run(() => takeOut(household.id, member.id, church));
              setOpen(false);
            }}
          >
            {t("households.removeAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** R2.1. Archiving asks first: it takes a family off every screen at once. */
function ArchiveOne({
  church,
  household,
  pending,
  run,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("households.archive", { name: household.name })}
          variant="ghost"
          disabled={pending}
        >
          <Archive />
        </IconButton>
      </DialogTrigger>

      <DialogContent alert title={t("households.archiveTitle", { name: household.name })}>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("households.archiveBody")}
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("households.keep")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              run(() => putAway(household.id, true, church));
              setOpen(false);
            }}
          >
            <Archive /> {t("households.archiveAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** R2.1. Two records for one family, put back together. */
function MergeInto({
  church,
  household,
  others,
  pending,
  run,
}: {
  church: string;
  household: HouseholdItem;
  others: HouseholdItem[];
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [into, setInto] = React.useState<string>();

  if (others.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label={t("households.merge")} variant="ghost" disabled={pending}>
          <Merge />
        </IconButton>
      </DialogTrigger>

      <DialogContent title={household.name} closeLabel={t("common.close")}>
        <Field label={t("households.merge")}>
          <Select value={into} onValueChange={setInto}>
            <SelectTrigger>
              <SelectValue placeholder={t("households.mergeChoose")} />
            </SelectTrigger>
            <SelectContent>
              {others.map((one) => (
                <SelectItem key={one.id} value={one.id}>
                  <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
                    <span className="shrink-0">{one.name}</span>
                    {one.members.length > 0 ? (
                      <span className="min-w-0 truncate text-[13px] text-fg-muted">
                        ({one.members.map((m) => m.name.split(" ")[0]).join(", ")})
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending || !into}
            onClick={() => {
              if (into) run(() => fold(household.id, into, church));
              setOpen(false);
            }}
          >
            {t("households.mergeAction", { name: household.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** R2.1. The one action this screen carries, beside its title. */
export function NewHousehold({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName_] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await add(name, church);
      setError(result.error);
      if (!result.error) {
        setName_("");
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {t("households.add")}
        </Button>
      </DialogTrigger>

      <DialogContent title={t("households.add")} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("households.failed")}>{error}</Banner> : null}

        <Field label={t("households.name")} required>
          <Input
            value={name}
            onChange={(e) => setName_(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={save}>
            {t("action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
