"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Undo2, Users } from "lucide-react";
import {
  Badge, Banner, Button, Card, Checkbox, EmptyState, Field, HueDot, Input, Separator, Textarea,
  Dialog, DialogTrigger, DialogContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { TimeField } from "@/components/time-field";
import { create, save, archive } from "./actions";
import { Roster, type RosterEntry } from "./roster";

export interface GroupTypeOption {
  id: string;
  name: string;
  hue: string;
}

export interface GroupItem {
  roster: RosterEntry[];
  id: string;
  name: string;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  frequency: string | null;
  location: string | null;
  capacity: number | null;
  openToJoin: boolean;
  listed: boolean;
  memberCount: number;
  leaders: { personId: string; name: string }[];
  archived: boolean;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;

/** "Tuesday", from the browser's own idea of the week. */
const dayName = (day: number) => {
  const d = new Date(2024, 0, 7 + day);
  return d.toLocaleDateString(undefined, { weekday: "long" });
};

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/**
 * R9.1 to R9.4. The groups a church runs.
 *
 * A list that says the thing somebody is looking for: what it is called, when
 * and where it meets, who leads it, and how many are in it. Opening one shows
 * its roster, because the roster is what a leader came here for.
 */
export function GroupList({
  church,
  groups,
  types,
}: {
  church: string;
  groups: GroupItem[];
  types: GroupTypeOption[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [open, setOpen] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const act = (fn: (d: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) => {
    const data = new FormData();
    data.set("church", church);
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const live = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);
  const opened = groups.find((g) => g.id === open);

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.title")}>{error}</Banner> : null}

      <div>
        <GroupDialog
          church={church}
          types={types}
          pending={pending}
          title={t("groups.add")}
          trigger={<Button><Plus /> {t("groups.add")}</Button>}
        />
      </div>

      {live.length === 0 ? (
        <EmptyState title={t("groups.none.title")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {live.map((group) => (
            <Card key={group.id} className="p-0">
              <button
                type="button"
                onClick={() => setOpen(group.id)}
                className="flex w-full flex-col gap-2 rounded-[inherit] p-[var(--d-pad-card)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {group.typeHue ? <HueDot hue={group.typeHue as Hue} /> : null}
                  <span className="text-heading text-fg">{group.name}</span>
                  {group.typeName ? (
                    <span className="text-caption text-fg-muted">{group.typeName}</span>
                  ) : null}
                </span>

                <span className="text-[length:var(--d-text-body)] text-fg-muted">
                  {group.dayOfWeek !== null && group.startsAt
                    ? t("groups.meets", {
                        day: dayName(group.dayOfWeek),
                        time: readableTime(group.startsAt),
                      })
                    : null}
                  {group.location ? ` ${group.location}` : ""}
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{plural("groups.memberCount", group.memberCount)}</Badge>
                  {group.leaders.length > 0 ? (
                    <span className="text-caption text-fg-muted">
                      {group.leaders.map((l) => l.name).join(", ")}
                    </span>
                  ) : null}
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-label text-fg-muted">{t("groups.archived")}</span>
          {archived.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{group.name}</span>
              <Button
                variant="ghost"
                onClick={() => act(archive, { id: group.id, archived: "false" })}
              >
                <Undo2 /> {t("groups.restore")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {/* The group itself: what it is, and who is in it. */}
      <Dialog open={opened !== undefined} onOpenChange={(on) => setOpen(on ? open : null)}>
        <DialogContent
          title={opened?.name ?? ""}
          closeLabel={t("common.close")}
          className="max-w-xl"
        >
          {opened ? (
            <div className="flex flex-col gap-4">
              {opened.description ? (
                <p className="text-[length:var(--d-text-body)] text-fg-muted">
                  {opened.description}
                </p>
              ) : null}

              <div className="max-h-[50vh] overflow-y-auto">
                <Roster church={church} groupId={opened.id} entries={opened.roster} />
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-2">
                <GroupDialog
                  church={church}
                  types={types}
                  group={opened}
                  pending={pending}
                  title={t("groups.editTitle", { name: opened.name })}
                  trigger={<Button variant="secondary"><Pencil /> {t("groups.edit")}</Button>}
                />
                <ArchiveDialog
                  name={opened.name}
                  pending={pending}
                  onConfirm={() => {
                    setOpen(null);
                    act(archive, { id: opened.id, archived: "true" });
                  }}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupDialog({
  church,
  types,
  group,
  pending,
  title,
  trigger,
}: {
  church: string;
  types: GroupTypeOption[];
  group?: GroupItem;
  pending: boolean;
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [typeId, setTypeId] = React.useState(group?.typeId ?? "");
  const [day, setDay] = React.useState(group?.dayOfWeek === null || group?.dayOfWeek === undefined ? "" : String(group.dayOfWeek));
  const [frequency, setFrequency] = React.useState(group?.frequency ?? "");
  const [openToJoin, setOpenToJoin] = React.useState(group?.openToJoin ?? true);
  const [listed, setListed] = React.useState(group?.listed ?? true);
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <form
          action={(data) => {
            data.set("church", church);
            data.set("typeId", typeId);
            data.set("dayOfWeek", day);
            data.set("frequency", frequency);
            if (group) data.set("id", group.id);
            startTransition(async () => {
              const result = await (group ? save(data) : create(data));
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? (
            <p className="text-[length:var(--d-text-body)] text-danger">{error}</p>
          ) : null}

          <Field label={t("groups.name")}>
            <Input name="name" defaultValue={group?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("groups.description")}>
            <Textarea name="description" rows={2} defaultValue={group?.description ?? ""} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.type")}</span>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger aria-label={t("groups.type")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <HueDot hue={type.hue as Hue} />
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.location")}>
              <Input name="location" defaultValue={group?.location ?? ""} autoComplete="off" />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.day")}</span>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger aria-label={t("groups.day")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{dayName(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.time")}>
              <TimeField name="startsAt" defaultValue={group?.startsAt ?? ""} />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groups.frequency")}</span>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger aria-label={t("groups.frequency")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{t(`groups.frequency.${f}` as never)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("groups.capacity")}>
              <Input
                name="capacity"
                inputMode="numeric"
                defaultValue={group?.capacity === null || group?.capacity === undefined ? "" : String(group.capacity)}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="openToJoin"
              checked={openToJoin}
              onCheckedChange={(on) => setOpenToJoin(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">{t("groups.openToJoin")}</span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              name="listed"
              checked={listed}
              onCheckedChange={(on) => setListed(on === true)}
            />
            <span className="text-[length:var(--d-text-body)] text-fg">{t("groups.listed")}</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || saving}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveDialog({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Archive /> {t("groups.archive")}</Button>
      </DialogTrigger>
      <DialogContent title={t("groups.archiveTitle", { name })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("groups.archiveBody")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              <Users /> {t("groups.archive")}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
