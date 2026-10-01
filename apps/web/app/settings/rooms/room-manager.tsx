"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, Undo2, ChevronUp, ChevronDown } from "lucide-react";
import {
  Banner, Button, Card, EmptyState, Field, HueDot, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { createRoom, saveRoom, archiveRoom, moveRoom } from "./actions";

const HUES: Hue[] = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
];

export interface RoomItem {
  id: string;
  name: string;
  hue: string;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  capacity: number | null;
  ratio: number | null;
  archived: boolean;
}

/** Months as the church would say them: 24 is two years, 18 is eighteen months. */
function say(months: number): { value: number; unit: "years" | "months" } {
  return months >= 12 && months % 12 === 0
    ? { value: months / 12, unit: "years" }
    : { value: months, unit: "months" };
}

function ageLine(room: RoomItem): string | null {
  const { minAgeMonths: from, maxAgeMonths: to } = room;
  if (from === null && to === null) return null;

  if (from !== null && to !== null) {
    const a = say(from);
    const b = say(to);
    // One unit for the pair, so "0 to 2 years" never reads as "0 to 24 months".
    const unit = a.unit === b.unit ? a.unit : "months";
    const lo = unit === "years" ? from / 12 : from;
    const hi = unit === "years" ? to / 12 : to;
    return t(unit === "years" ? "rooms.age.years" : "rooms.age.months", { from: lo, to: hi });
  }

  if (to !== null) {
    const b = say(to);
    return t(b.unit === "years" ? "rooms.age.underYears" : "rooms.age.underMonths", { to: b.value });
  }

  const a = say(from!);
  return t(a.unit === "years" ? "rooms.age.overYears" : "rooms.age.overMonths", { from: a.value });
}

/**
 * R8.14 to R8.17. The rooms children are checked into.
 *
 * Four numbers a church sets once and a station reads every Sunday: who the
 * room is for, how many it holds, how many volunteers it needs, and what colour
 * it prints. The colour is how a volunteer points a parent at the right door
 * across a full foyer, so it is part of the configuration rather than a theme.
 */
export function RoomManager({ church, rooms }: { church: string; rooms: RoomItem[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
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

  const open = rooms.filter((r) => !r.archived);
  const archived = rooms.filter((r) => r.archived);

  const move = (index: number, by: number) => {
    const next = [...open];
    const [row] = next.splice(index, 1);
    next.splice(index + by, 0, row!);
    act(moveRoom, { ids: [...next, ...archived].map((r) => r.id).join(",") });
  };

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("rooms.title")}>{error}</Banner> : null}

      <div>
        <RoomDialog
          church={church}
          pending={pending}
          trigger={<Button><Plus /> {t("rooms.add")}</Button>}
          title={t("rooms.add")}
          onSave={(fields) => act(createRoom, fields)}
        />
      </div>

      {open.length === 0 ? (
        <EmptyState title={t("rooms.none.title")} body={t("rooms.none.body")} />
      ) : (
        <Card>
          <ul className="flex flex-col">
            {open.map((room, i) => (
              <li key={room.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <HueDot hue={room.hue as Hue} />
                    <div className="min-w-0">
                      <div className="truncate text-[length:var(--d-text-body)] text-fg">{room.name}</div>
                      <div className="flex flex-wrap gap-x-3 text-caption text-fg-muted">
                        {ageLine(room) ? <span>{ageLine(room)}</span> : null}
                        {room.capacity === null ? null : (
                          <span>{t("rooms.holds", { n: room.capacity })}</span>
                        )}
                        {room.ratio === null ? null : (
                          <span>{t("rooms.perVolunteer", { n: room.ratio })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      aria-label={t("rooms.moveUp")}
                      disabled={i === 0 || pending}
                      onClick={() => move(i, -1)}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={t("rooms.moveDown")}
                      disabled={i === open.length - 1 || pending}
                      onClick={() => move(i, 1)}
                    >
                      <ChevronDown />
                    </Button>
                    <RoomDialog
                      church={church}
                      room={room}
                      pending={pending}
                      trigger={<Button variant="ghost"><Pencil /> {t("rooms.edit")}</Button>}
                      title={t("rooms.editTitle", { name: room.name })}
                      onSave={(fields) => act(saveRoom, { id: room.id, ...fields })}
                    />
                    <ArchiveDialog
                      room={room}
                      pending={pending}
                      onConfirm={() => act(archiveRoom, { id: room.id, archived: "1" })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {archived.length === 0 ? null : (
        <Card>
          <h2 className="mb-3 text-title text-fg">{t("rooms.archived")}</h2>
          <ul className="flex flex-col">
            {archived.map((room, i) => (
              <li key={room.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-fg-subtle">
                    <HueDot hue={room.hue as Hue} />
                    <span className="text-[length:var(--d-text-body)]">{room.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act(archiveRoom, { id: room.id, archived: "0" })}
                  >
                    <Undo2 /> {t("rooms.restore")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Adding a room and editing one ask for the same six things. */
function RoomDialog({
  church,
  room,
  pending,
  trigger,
  title,
  onSave,
}: {
  church: string;
  room?: RoomItem;
  pending: boolean;
  trigger: React.ReactNode;
  title: string;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [hue, setHue] = React.useState(room?.hue ?? "sky");

  const start = room ? (room.minAgeMonths === null ? null : say(room.minAgeMonths)) : null;
  const end = room ? (room.maxAgeMonths === null ? null : say(room.maxAgeMonths)) : null;

  const [fromUnit, setFromUnit] = React.useState<string>(start?.unit ?? "months");
  const [toUnit, setToUnit] = React.useState<string>(end?.unit ?? "years");

  const months = (raw: FormDataEntryValue | null, unit: string): string => {
    const text = String(raw ?? "").trim();
    if (!text) return "";
    const value = Number(text);
    if (!Number.isFinite(value)) return text;
    return String(unit === "years" ? Math.round(value * 12) : Math.round(value));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <form
          action={(data) => {
            onSave({
              name: String(data.get("name") ?? ""),
              hue,
              minAgeMonths: months(data.get("from"), fromUnit),
              maxAgeMonths: months(data.get("to"), toUnit),
              capacity: String(data.get("capacity") ?? ""),
              ratio: String(data.get("ratio") ?? ""),
            });
            setOpen(false);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field label={t("rooms.name")} required>
            <Input name="name" defaultValue={room?.name ?? ""} autoComplete="off" />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("rooms.colour")}</span>
            <div className="flex flex-wrap gap-1.5">
              {HUES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={option}
                  aria-pressed={hue === option}
                  onClick={() => setHue(option)}
                  className={
                    hue === option
                      ? "rounded-full p-1 ring-2 ring-primary"
                      : "rounded-full p-1 ring-2 ring-transparent hover:ring-line-strong"
                  }
                >
                  <HueDot hue={option} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <AgeField
              label={t("rooms.from")}
              name="from"
              defaultValue={start?.value}
              unit={fromUnit}
              onUnit={setFromUnit}
            />
            <AgeField
              label={t("rooms.to")}
              name="to"
              defaultValue={end?.value}
              unit={toUnit}
              onUnit={setToUnit}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <Field label={t("rooms.capacity")} className="flex-1">
              <Input
                name="capacity"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={room?.capacity ?? ""}
              />
            </Field>
            <Field label={t("rooms.ratio")} className="flex-1">
              <Input
                name="ratio"
                type="number"
                min={1}
                inputMode="numeric"
                defaultValue={room?.ratio ?? ""}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A number and the unit it is in, because a nursery is counted in months. */
function AgeField({
  label,
  name,
  defaultValue,
  unit,
  onUnit,
}: {
  label: string;
  name: string;
  defaultValue: number | undefined;
  unit: string;
  onUnit: (unit: string) => void;
}) {
  return (
    <div className="flex min-w-56 flex-1 flex-col gap-1.5">
      <span className="text-label text-fg">{label}</span>
      <div className="flex gap-2">
        <Input
          name={name}
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={defaultValue ?? ""}
          className="flex-1"
          aria-label={label}
        />
        <Select value={unit} onValueChange={onUnit}>
          <SelectTrigger aria-label={label} className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="months">{t("rooms.unit.months")}</SelectItem>
            <SelectItem value="years">{t("rooms.unit.years")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ArchiveDialog({
  room,
  pending,
  onConfirm,
}: {
  room: RoomItem;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Archive /> {t("rooms.archive")}</Button>
      </DialogTrigger>
      <DialogContent alert title={t("rooms.archiveTitle", { name: room.name })}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
          {t("rooms.archiveBody")}
        </p>
        <DialogFooter>
          <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
            {t("rooms.keep")}
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => { onConfirm(); setOpen(false); }}
          >
            <Archive /> {t("rooms.archiveAction", { name: room.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
