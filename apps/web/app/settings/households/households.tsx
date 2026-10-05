"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Merge, Plus, Undo2, X } from "lucide-react";
import {
  Avatar, Banner, Button, Field, IconButton, Input,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  LIFT,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { householdRoleOptions } from "@/lib/person-input";
import { Empty } from "@/components/empty";
import { SearchField } from "@/components/search-field";
import { add, setName, setRole, putAway, fold, freePeople, putIn, takeOut } from "./actions";

export interface HouseholdItem {
  id: string;
  name: string;
  members: { id: string; slug: string; name: string; role: string }[];
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
              className={`relative flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5 ${LIFT}`}
            >
              {/* R24.6. The whole card opens the family. The trigger is a layer
                  over it rather than a wrapper around it, so merge, archive and
                  every person's chip stay controls of their own. */}
              <EditHousehold
                household={household}
                pending={pending}
                run={run}
                church={church}
                trigger={
                  <button
                    type="button"
                    aria-label={t("households.edit", { name: household.name })}
                    className="absolute inset-0 cursor-pointer rounded-[14px]"
                  />
                }
              />

              <div className="pointer-events-none relative flex items-center gap-3 border-b border-sunken pb-3">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
                  {household.name}
                </h3>

                <div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
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
                <ul className="relative flex flex-wrap gap-1.5">
                  {household.members.map((member) => (
                    <li key={member.id}>
                      <Link
                        href={`/members/${member.slug}?church=${church}`}
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
 * is rarely why somebody came here. Adding offers only members in no household,
 * since somebody lives in one at a time and offering a name already in another
 * is offering a mistake.
 */
function EditHousehold({
  church,
  household,
  pending,
  run,
  trigger,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName_] = React.useState(household.name);

  React.useEffect(() => {
    if (open) setName_(household.name);
  }, [open, household.name]);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

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

          <Members
            church={church}
            household={household}
            pending={pending}
            run={run}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * R2.1. Who is in a household, and the way to change that.
 *
 * Shared by the family being edited and the one being made, so adding somebody
 * works the same in both and a church never has to go back to the list to
 * finish what it started.
 */
function Members({
  church,
  household,
  pending,
  run,
  onAdded,
  onRemoved,
  onRole,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
  /** Given while a household is being made, where the list is held here. */
  onAdded?: (person: { id: string; name: string }) => void;
  onRemoved?: (id: string) => void;
  onRole?: (id: string, role: string) => void;
}) {
  const [find, setFind] = React.useState("");
  const [free, setFree] = React.useState<{ id: string; slug: string; name: string }[]>([]);
  const [looking, setLooking] = React.useState(false);

  /*
   * Searched on the server, and nothing until somebody types. A church of 500
   * is not a list to ship to the browser, and opening this box should show the
   * family it was opened for rather than four hundred names to scroll past.
   */
  React.useEffect(() => {
    if (find.trim().length < 2) {
      setFree([]);
      return;
    }

    let live = true;
    setLooking(true);
    const timer = setTimeout(async () => {
      const rows = await freePeople(find, church);
      if (live) {
        setFree(rows.filter((one) => !household.members.some((m) => m.id === one.id)));
        setLooking(false);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [find, church, household.members]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-label text-fg">{t("households.members")}</span>

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
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{member.name}</span>

                <Select
                  value={member.role}
                  onValueChange={(next) => {
                    onRole?.(member.id, next);
                    run(() => setRole(household.id, member.id, next, church));
                  }}
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
                  onRemoved={onRemoved}
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

        {find.trim().length < 2 ? null : looking ? null : free.length === 0 ? (
          <p className="text-[13px] text-fg-subtle">{t("households.addPersonNone")}</p>
        ) : (
          <ul className="flex max-h-56 flex-col overflow-auto">
            {free.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    onAdded?.(person);
                    setFree((prev) => prev.filter((one) => one.id !== person.id));
                    run(() => putIn(household.id, person.id, church));
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-1 py-2 text-left hover:bg-sunken"
                >
                  <Avatar
                    name={person.name}
                    id={person.id}
                    className="size-7 text-[11px] font-semibold"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{person.name}</span>
                  <Plus className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** R2.1. Taking somebody out asks first: it is a change to two records. */
function TakeOut({
  church,
  household,
  member,
  pending,
  run,
  onRemoved,
}: {
  church: string;
  household: HouseholdItem;
  member: HouseholdItem["members"][number];
  pending: boolean;
  run: (work: () => Promise<{ error?: string }>) => void;
  onRemoved?: (id: string) => void;
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
              onRemoved?.(member.id);
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

/**
 * R2.1. A new family: its name and who is in it, in one box.
 *
 * The members are held here until the name is saved, so a church answers both
 * questions in the order it thinks of them rather than creating an empty
 * household and then being sent to the list to find it.
 */
export function NewHousehold({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName_] = React.useState("");
  const [chosen, setChosen] = React.useState<HouseholdItem["members"]>([]);
  const [find, setFind] = React.useState("");
  const [free, setFree] = React.useState<{ id: string; slug: string; name: string }[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName_("");
      setChosen([]);
      setFind("");
      setFree([]);
      setError(undefined);
    }
  };

  React.useEffect(() => {
    if (!open || find.trim().length < 2) {
      setFree([]);
      return;
    }

    let live = true;
    const timer = setTimeout(async () => {
      const rows = await freePeople(find, church);
      if (live) setFree(rows.filter((one) => !chosen.some((m) => m.id === one.id)));
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, find, church, chosen]);

  const create = () =>
    startTransition(async () => {
      const made = await add(name, church);
      if (made.error || !made.id) {
        setError(made.error);
        return;
      }

      for (const person of chosen) {
        const put = await putIn(made.id, person.id, church);
        if (put.error) {
          setError(put.error);
          return;
        }
        if (person.role !== "other") {
          await setRole(made.id, person.id, person.role, church);
        }
      }

      close(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {t("households.add")}
        </Button>
      </DialogTrigger>

      <DialogContent title={t("households.add")} closeLabel={t("common.close")} className="max-w-xl">
        {error ? <Banner tone="danger" title={t("households.failed")}>{error}</Banner> : null}

        <div className="flex flex-col gap-5">
          <Field label={t("households.name")} required>
            <Input
              value={name}
              onChange={(e) => setName_(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          {chosen.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-label text-fg">{t("households.members")}</span>

              <ul className="flex flex-col">
                {chosen.map((person) => (
                  <li
                    key={person.id}
                    className="flex items-center gap-2.5 border-b border-sunken py-2 last:border-0"
                  >
                    <Avatar
                      name={person.name}
                      id={person.id}
                      className="size-7 text-[11px] font-semibold"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">
                      {person.name}
                    </span>

                    <Select
                      value={person.role}
                      onValueChange={(next) =>
                        setChosen((prev) =>
                          prev.map((one) => (one.id === person.id ? { ...one, role: next } : one)),
                        )
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

                    <IconButton
                      label={t("households.remove", { name: person.name })}
                      variant="ghost"
                      onClick={() =>
                        setChosen((prev) => prev.filter((one) => one.id !== person.id))
                      }
                    >
                      <X />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("households.addPerson")}</span>

            <SearchField
              value={find}
              onChange={setFind}
              placeholder={t("households.addPersonSearch")}
            />

            {find.trim().length < 2 ? null : free.length === 0 ? (
              <p className="text-[13px] text-fg-subtle">{t("households.addPersonNone")}</p>
            ) : (
              <ul className="flex max-h-56 flex-col overflow-auto">
                {free.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setChosen((prev) => [...prev, { ...person, role: "other" }])
                      }
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

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => close(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={create}>
            {t("action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
