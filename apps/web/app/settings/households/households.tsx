"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Merge, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { setName, putAway, fold } from "./actions";

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
 * the same one back together. A row each, with its people under it.
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
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const open = households.filter((one) => !one.archived);
  const archived = households.filter((one) => one.archived);

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("households.failed")}>{error}</Banner> : null}

      <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
        {open.map((household) => (
          <div
            key={household.id}
            className="flex flex-wrap items-start gap-3 border-b border-sunken py-3.5 last:border-0"
          >
            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
              <span className="font-medium text-fg">{household.name}</span>

              {household.members.length === 0 ? (
                <span className="text-[13px] text-fg-subtle">{t("households.nobody")}</span>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {household.members.map((member) => (
                    <Link
                      key={member.id}
                      href={`/people/${member.id}?church=${church}`}
                      className="text-[13px] text-primary underline-offset-4 hover:underline"
                    >
                      {member.name}
                      <span className="text-fg-subtle">
                        {" "}
                        {t(`householdRole.${member.role}` as never)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <Rename household={household} pending={pending} run={run} church={church} />
              <MergeInto
                household={household}
                others={open.filter((one) => one.id !== household.id)}
                pending={pending}
                run={run}
                church={church}
              />
              <IconButton
                label={t("households.archive", { name: household.name })}
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => putAway(household.id, true, church))}
              >
                <Archive />
              </IconButton>
            </div>
          </div>
        ))}
      </section>

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
        <Button variant="ghost" className="min-h-[34px] px-2.5 text-[13px]">
          {t("households.rename")}
        </Button>
      </DialogTrigger>

      <DialogContent title={household.name} closeLabel={t("common.close")}>
        <Field label={t("households.name")} required>
          <Input value={name} onChange={(e) => setName_(e.target.value)} autoComplete="off" autoFocus />
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
                      <span className="text-[13px] text-primary">
                        {one.members.map((m) => m.name.split(" ")[0]).join(", ")}
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
