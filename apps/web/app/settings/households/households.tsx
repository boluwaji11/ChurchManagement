"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Merge, Pencil, Plus, Search, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { add, setName, putAway, fold } from "./actions";

export interface HouseholdItem {
  id: string;
  name: string;
  members: { id: string; name: string; role: string }[];
  archived: boolean;
}

/** Two letters for a face, from whatever the church wrote the name as. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
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

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <Input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder={t("households.search")}
          aria-label={t("households.search")}
          className="pl-9"
        />
      </div>

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
              <div className="flex items-center gap-3">
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
                  {household.name}
                </h3>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Rename household={household} pending={pending} run={run} church={church} />
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
                <ul className="grid gap-x-4 gap-y-2 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
                  {household.members.map((member) => (
                    <li key={member.id}>
                      <Link
                        href={`/people/${member.id}?church=${church}`}
                        className="flex items-center gap-2.5 rounded-md py-1 hover:bg-sunken"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-fg-muted">
                          {initialsOf(member.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] font-medium text-fg">
                          {member.name}
                        </span>
                        <span className="shrink-0 text-[12px] text-fg-subtle">
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

function Rename({
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

  React.useEffect(() => {
    if (open) setName_(household.name);
  }, [open, household.name]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("households.rename", { name: household.name })}
          variant="ghost"
          disabled={pending}
        >
          <Pencil />
        </IconButton>
      </DialogTrigger>

      <DialogContent title={household.name} closeLabel={t("common.close")}>
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
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => {
              run(() => setName(household.id, name, church));
              setOpen(false);
            }}
          >
            {t("action.save")}
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
                  <span className="flex items-baseline gap-1.5">
                    {one.name}
                    {one.members.length > 0 ? (
                      <span className="text-[13px] text-fg-muted">
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
