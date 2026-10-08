"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ChevronRight, Merge, Plus, Undo2, X } from "lucide-react";
import {
  Avatar, Banner, Button, Field, IconButton, Input, Spinner,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  LIFT,
} from "@connectapp/ui";
import type { HouseholdAddress } from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { householdRoleOptions } from "@/lib/person-input";
import { Empty } from "@/components/empty";
import { SearchField } from "@/components/search-field";
import {
  add, setName, setAddress, setRole, putAway, fold, freePeople, putIn, takeOut,
} from "./actions";
import { useFormError } from "@/lib/form-error";

export interface HouseholdItem {
  id: string;
  name: string;
  members: { id: string; slug: string; name: string; role: string }[];
  archived: boolean;
  /** R2.4. Where the church writes to, when it holds one. */
  address: HouseholdAddress | null;
  /** R2.4. The addresses the people in it hold of their own. */
  memberAddresses: { memberId: string; name: string; address: HouseholdAddress }[];
}

/**
 * R2.1. Every household, and what a church can do with one.
 *
 * A household used to exist only as a side effect of editing a person, which
 * left a church with no way to see a family, rename it, or put two halves of
 * the same one back together.
 */
/**
 * R24.6. A part of the panel that folds away.
 *
 * A household panel carries three things that have nothing to say to each
 * other: what it is called, who is in it, and where it is. A church changing
 * a surname should not have to scroll past six people to reach Save, so each
 * part folds, and it is the summary line that opens it rather than a mark
 * beside the heading.
 */
function Part({
  title,
  count,
  open,
  onOpen,
  children,
}: {
  title: string;
  /** What is inside, read before opening it. */
  count?: string;
  open: boolean;
  onOpen: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpen(!open)}
        className="flex min-h-[var(--d-tap)] cursor-pointer items-center gap-2 rounded-md text-left hover:text-primary"
      >
        <ChevronRight
          aria-hidden
          className={`size-4 shrink-0 text-fg-subtle transition-transform duration-instant ${open ? "rotate-90" : ""}`}
        />
        <span className="text-[15px] font-semibold text-fg">{title}</span>
        {count ? <span className="text-[13px] text-fg-muted">{count}</span> : null}
      </button>

      {open ? <div className="flex flex-col gap-4 pt-2">{children}</div> : null}
    </div>
  );
}

/** R2.4. An address, as the five boxes the panel types into. */
const parts = (held: HouseholdItem["address"]) => ({
  line1: held?.line1 ?? "",
  line2: held?.line2 ?? "",
  city: held?.city ?? "",
  region: held?.region ?? "",
  postalCode: held?.postalCode ?? "",
});

export function HouseholdList({
  church,
  households,
  onlyArchived = false,
}: {
  church: string;
  households: HouseholdItem[];
  /** R2.1. The families that have been put away, rather than the ones in use. */
  onlyArchived?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [find, setFind] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  /* Which household's action is running, so one control spins rather than all. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  const run = (key: string, work: () => Promise<{ error?: string }>) => {
    setDoing(key);
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  // A church with forty families looks for one by its name, or by the name of
  // somebody in it, which is how a volunteer actually remembers a household.
  const needle = find.trim().toLowerCase();
  const matches = (one: HouseholdItem) =>
    !needle ||
    one.name.toLowerCase().includes(needle) ||
    one.members.some((m) => m.name.toLowerCase().includes(needle));

  const shown = households.filter(matches);

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("households.failed")}>{error}</Banner> : null}

      <SearchField
        value={find}
        onChange={setFind}
        placeholder={t("households.search")}
      />

      {shown.length === 0 ? (
        <Empty icon="noResults" title={t("households.noResults")} />
      ) : null}

      {shown.length > 0 && !onlyArchived ? (
        <section className="flex flex-col gap-3">
          {shown.map((household) => (
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
                doing={doing}
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
                    doing={doing}
                    run={run}
                    church={church}
                  />
                  <ArchiveOne
                    household={household}
                    pending={pending}
                    doing={doing}
                    run={run}
                    church={church}
                  />
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
                          className="size-6 text-[12px] font-semibold"
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

      {shown.length > 0 && onlyArchived ? (
        <section className="flex flex-col gap-2">
          <div className="rounded-[14px] border border-line bg-surface px-5 py-1">
            {shown.map((household) => (
              <div
                key={household.id}
                className="flex items-center gap-3 border-b border-sunken py-2.5 last:border-0"
              >
                <span className="flex-1 text-fg-subtle">{household.name}</span>
                <IconButton
                  label={t("households.restore", { name: household.name })}
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    run(`restore:${household.id}`, () => putAway(household.id, false, church))
                  }
                >
                  {doing === `restore:${household.id}` ? (
                    <Spinner label={t("households.restore", { name: household.name })} />
                  ) : (
                    <Undo2 />
                  )}
                </IconButton>
              </div>
            ))}
          </div>
        </section>
      ) : null}
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
  doing,
  run,
  trigger,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  doing?: string;
  run: (key: string, work: () => Promise<{ error?: string }>) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName_] = React.useState(household.name);
  const [where, setWhere] = React.useState(() => parts(household.address));
  /** Where the cursor goes when a pick has nothing to copy. */
  const street = React.useRef<HTMLInputElement>(null);
  /* Both folded when it opens, and each opens on its own. The panel's first
     screen is then the household's name and what it holds, which is what
     somebody arriving at it is looking at. */
  const [openMembers, setOpenMembers] = React.useState(false);
  const [openAddress, setOpenAddress] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName_(household.name);
      setWhere(parts(household.address));
      setOpenMembers(false);
      setOpenAddress(false);
    }
  }, [open, household.name, household.address]);

  /* The five fields go back as one address, on leaving any of them, the same
     way the name above them saves. */
  const keep = () => {
    const was = parts(household.address);
    const same = (Object.keys(was) as (keyof typeof was)[])
      .every((key) => was[key].trim() === where[key].trim());
    if (same) return;
    run(`address:${household.id}`, () => setAddress(household.id, where, church));
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent title={household.name} closeLabel={t("common.close")} width="560px">
        <div className="flex flex-col divide-y divide-line">
          <div className="pb-4">
            <Field label={t("households.name")} required>
              <Input
                value={name}
                onChange={(e) => setName_(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name.trim() !== household.name) {
                    run(`name:${household.id}`, () => setName(household.id, name, church));
                  }
                }}
                autoComplete="off"
              />
            </Field>
          </div>

          <div className="py-4">
            <Part
              title={t("households.members")}
              count={plural("households.memberCount", household.members.length)}
              open={openMembers}
              onOpen={setOpenMembers}
            >
              <Members
                church={church}
                household={household}
                pending={pending}
                doing={doing}
                run={run}
              />
            </Part>
          </div>

          <div className="pt-4">
            <Part
              title={t("households.address")}
              count={household.address?.line1 ?? undefined}
              open={openAddress}
              onOpen={setOpenAddress}
            >
              {/* R2.4. A family is entered one person at a time, so the
                  address the church already holds is usually on somebody's
                  own record. Picking somebody who has one copies it; picking
                  somebody who has not leaves the boxes to type theirs in. */}
              {household.members.length > 0 ? (
                <Field label={t("households.sameAs")}>
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const theirs = household.memberAddresses
                        .find((one) => one.memberId === id)?.address;
                      const next = {
                        line1: theirs?.line1 ?? "",
                        line2: theirs?.line2 ?? "",
                        city: theirs?.city ?? "",
                        region: theirs?.region ?? "",
                        postalCode: theirs?.postalCode ?? "",
                      };
                      setWhere(next);
                      if (theirs) {
                        run(`address:${household.id}`, () =>
                          setAddress(household.id, next, church));
                      } else {
                        street.current?.focus();
                      }
                    }}
                  >
                    <SelectTrigger aria-label={t("households.sameAs")}>
                      <SelectValue placeholder={t("households.sameAsWho")} />
                    </SelectTrigger>
                    <SelectContent>
                      {household.members.map((who) => (
                        <SelectItem key={who.id} value={who.id}>{who.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]">
                <Field label={t("address.line1")} className="[grid-column:1/-1]">
                  <Input
                    ref={street}
                    value={where.line1}
                    onChange={(e) => setWhere({ ...where, line1: e.target.value })}
                    onBlur={keep}
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("address.line2")} className="[grid-column:1/-1]">
                  <Input
                    value={where.line2}
                    onChange={(e) => setWhere({ ...where, line2: e.target.value })}
                    onBlur={keep}
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("address.city")}>
                  <Input
                    value={where.city}
                    onChange={(e) => setWhere({ ...where, city: e.target.value })}
                    onBlur={keep}
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("address.region")}>
                  <Input
                    value={where.region}
                    onChange={(e) => setWhere({ ...where, region: e.target.value })}
                    onBlur={keep}
                    autoComplete="off"
                  />
                </Field>
                <Field label={t("address.postalCode")}>
                  <Input
                    value={where.postalCode}
                    onChange={(e) => setWhere({ ...where, postalCode: e.target.value })}
                    onBlur={keep}
                    autoComplete="off"
                  />
                </Field>
              </div>
            </Part>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
  doing,
  run,
  onAdded,
  onRemoved,
  onRole,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  doing?: string;
  run: (key: string, work: () => Promise<{ error?: string }>) => void;
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
      {/* R2.1. Adding comes first. A household is opened to put somebody in
          it far more often than to read who is already there. */}
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
                    run(`putIn:${person.id}`, () => putIn(household.id, person.id, church));
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

      {household.members.length === 0 ? (
        <p className="text-[13px] text-fg-subtle">{t("households.nobody")}</p>
      ) : (
        /* R24.4. The thread the rest of the product uses for a thing inside a
           thing, drawn in two pieces so the line crosses the gap between
           rows. */
        <ul className="m-0 flex list-none flex-col p-0">
          {household.members.map((member, at) => {
            const last = at === household.members.length - 1;

            return (
              <li key={member.id} className="flex min-w-0 gap-3">
                <span
                  aria-hidden
                  className="flex w-7 shrink-0 flex-col items-center self-stretch"
                >
                  {/* The darker hairline: a 1px rule in the line colour
                      disappears between two coloured faces. */}
                  <span className={`h-2.5 w-px ${at === 0 ? "" : "bg-line-strong"}`} />
                  <Avatar
                    name={member.name}
                    id={member.id}
                    className="size-7 shrink-0 text-[11px] font-semibold"
                  />
                  <span className={`w-px flex-1 ${last ? "" : "bg-line-strong"}`} />
                </span>

                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">
                    {member.name}
                  </span>

                  <Select
                    value={member.role}
                    onValueChange={(next) => {
                      onRole?.(member.id, next);
                      run(`role:${member.id}`, () =>
                        setRole(household.id, member.id, next, church),
                      );
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
                    doing={doing}
                    run={run}
                    onRemoved={onRemoved}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** R2.1. Taking somebody out asks first: it is a change to two records. */
function TakeOut({
  church,
  household,
  member,
  pending,
  doing,
  run,
  onRemoved,
}: {
  church: string;
  household: HouseholdItem;
  member: HouseholdItem["members"][number];
  pending: boolean;
  doing?: string;
  run: (key: string, work: () => Promise<{ error?: string }>) => void;
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
          {doing === `remove:${member.id}` ? (
            <Spinner label={t("households.remove", { name: member.name })} />
          ) : (
            <X />
          )}
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
              run(`remove:${member.id}`, () => takeOut(household.id, member.id, church));
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
  doing,
  run,
}: {
  church: string;
  household: HouseholdItem;
  pending: boolean;
  doing?: string;
  run: (key: string, work: () => Promise<{ error?: string }>) => void;
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
          {doing === `archive:${household.id}` ? (
            <Spinner label={t("households.archive", { name: household.name })} />
          ) : (
            <Archive />
          )}
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
              run(`archive:${household.id}`, () => putAway(household.id, true, church));
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
  doing,
  run,
}: {
  church: string;
  household: HouseholdItem;
  others: HouseholdItem[];
  pending: boolean;
  doing?: string;
  run: (key: string, work: () => Promise<{ error?: string }>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [into, setInto] = React.useState<string>();

  // Once the merge has run the chosen household is gone, so the id has to go
  // with it rather than sitting behind a live confirm button.
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setInto(undefined);
  };

  if (others.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <IconButton label={t("households.merge")} variant="ghost" disabled={pending}>
          {doing === `merge:${household.id}` ? (
            <Spinner label={t("households.merge")} />
          ) : (
            <Merge />
          )}
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
          <Button type="button" variant="secondary" onClick={() => close(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending || !into}
            onClick={() => {
              if (into) run(`merge:${household.id}`, () => fold(household.id, into, church));
              close(false);
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
  const [error, setError] = useFormError(open);
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
          <Button
            type="button"
            loading={pending}
            disabled={pending || !name.trim()}
            onClick={create}
          >
            {t("action.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
