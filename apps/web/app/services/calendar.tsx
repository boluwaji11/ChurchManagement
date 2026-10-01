"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Undo2, Repeat, Pencil, Users, ClipboardList } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, Field, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Table, Thead, Th, Tr, Td, Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { addGathering, setCancelled, stopRepeat, editGathering, recordHeadcount } from "./actions";
import { MonthGrid } from "./grid";
import { Tiles } from "./tiles";
import type { View } from "./view";

const REPEATS = ["never", "weekly", "fortnightly", "monthly"] as const;

export interface GatheringRow {
  id: string;
  name: string;
  occursOn: string;
  startsAt: string;
  status: string;
  note: string | null;
  special: boolean;
  serviceTimeId: string | null;
  /** "weekly", "fortnightly" or "monthly" when it repeats. */
  frequency: string | null;
  adults: number | null;
  children: number | null;
  visitors: number | null;
  total: number | null;
  past: boolean;
  present: number;
  readableDate: string;
  readableTime: string;
}

/**
 * R7.1. The services a church holds, and the two things it does to them.
 *
 * Add one, and say which weeks did not happen. There is no calendar to
 * maintain: a service that repeats keeps itself six months ahead, topped up
 * whenever this page is read. A cancelled service stays on the list, greyed,
 * because a Sunday that vanished leaves a gap in the attendance record that
 * reads as a collapse.
 */
export function Calendar({
  church,
  rows,
  canEdit,
  view,
  month,
  today,
  nowTime,
  monthBar,
  viewBar,
}: {
  church: string;
  rows: GatheringRow[];
  canEdit: boolean;
  view: View;
  /** "2026-09", for the grid. */
  month: string;
  /** The church's own today, as ISO. */
  today: string;
  /** The church's own clock, as HH:MM. */
  nowTime: string;
  /** The month arrows, rendered by the page. */
  monthBar: React.ReactNode;
  /** List, calendar or tiles. */
  viewBar: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [repeat, setRepeat] = React.useState("never");
  const [adding, setAdding] = React.useState(false);
  // Which day was pressed in the calendar, so the dialog opens on it.
  const [addOn, setAddOn] = React.useState<string>("");
  const [addError, setAddError] = React.useState<string>();
  // Which day the dialog is on, so the time field can refuse a time that has
  // already gone when that day is today.
  const [addDate, setAddDate] = React.useState<string>("");

  const act = (
    fn: (d: FormData) => Promise<{ error?: string }>,
    data: FormData,
    after?: () => void,
    report: (error: string | undefined) => void = setError,
  ) => {
    data.set("church", church);
    startTransition(async () => {
      const result = await fn(data);
      report(result.error);
      if (!result.error) {
        after?.();
        router.refresh();
      }
    });
  };

  const simple = (fn: (d: FormData) => Promise<{ error?: string }>, fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    act(fn, data);
  };

  /**
   * What a church can do to one service. The list row, the calendar chip and
   * the tile all offer the same set, so it is written once.
   */
  const rowActions = (row: GatheringRow) => {
    const cancelled = row.status === "cancelled";
    return (
      <>
                {row.past && !cancelled ? (
                  <Button variant="ghost" asChild>
                    <Link href={`/services/${row.id}?church=${church}`}>
                      <ClipboardList /> {t("roster.title")}
                    </Link>
                  </Button>
                ) : null}
                {row.past && !cancelled ? (
                  <CountDialog
                    row={row}
                    pending={pending}
                    onSave={(fields) => simple(recordHeadcount, { id: row.id, ...fields })}
                  />
                ) : null}
                <EditDialog
                  row={row}
                  pending={pending}
                  onSave={(fields) => simple(editGathering, { id: row.id, ...fields })}
                />
                {cancelled ? (
                  <Button
                    variant="ghost"
                    onClick={() => simple(setCancelled, { id: row.id, cancelled: "0" })}
                  >
                    <Undo2 /> {t("services.restore")}
                  </Button>
                ) : (
                  <CancelDialog
                    row={row}
                    pending={pending}
                    onConfirm={(note) => simple(setCancelled, { id: row.id, cancelled: "1", note })}
                  />
                )}
                {row.special ? null : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost">{t("services.stopRepeat")}</Button>
                    </DialogTrigger>
                    <DialogContent
                      alert
                      title={t("services.stopRepeatTitle", { name: row.name })}
                    >
                      <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                        {t("services.stopRepeatBody")}
                      </p>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="ghost" data-dismiss>{t("services.keepRepeating")}</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button
                            variant="danger"
                            onClick={() =>
                              simple(stopRepeat, { serviceTimeId: row.serviceTimeId ?? "" })
                            }
                          >
                            {t("services.stopRepeat")}
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
      </>
    );
  };

  const actionsFor = canEdit ? rowActions : () => null;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("services.failed")}>{error}</Banner> : null}

      {/* The month on the left, and on the right the thing a church came to do
          with it above the thing that changes how it is drawn. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {monthBar}
        <div className="flex flex-col items-end gap-2">
          {canEdit ? (
            <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button
                onClick={() => { setAddOn(""); setAddDate(""); setAddError(undefined); }}
              >
                <Plus /> {t("services.add")}
              </Button>
            </DialogTrigger>
            <DialogContent title={t("services.add")} closeLabel={t("common.close")}>
              {addError ? (
                <div className="mb-4">
                  <Banner tone="danger" title={t("services.add")}>{addError}</Banner>
                </div>
              ) : null}
              <form
                key={addOn}
                action={(data) => {
                  data.set("repeat", repeat);
                  // The error belongs where the form is, so it is read without
                  // closing the dialog to look for it.
                  act(addGathering, data, () => setAdding(false), setAddError);
                }}
                noValidate
                className="flex flex-col gap-4"
              >
                <Field label={t("services.name")} required>
                  <Input name="name" autoComplete="off" />
                </Field>
                <div className="flex flex-wrap gap-4">
                  <Field label={t("services.date")} required className="flex-1">
                    <DateField
                      name="occursOn"
                      defaultValue={addOn}
                      min={today}
                      onValueChange={setAddDate}
                    />
                  </Field>
                  <Field label={t("services.time")} required className="flex-1">
                    {/* A service is planned. A day that has gone is not a day to
                        plan, and on today the hours that have gone are not
                        hours to plan either. */}
                    <TimeField
                      name="startsAt"
                      min={(addDate || addOn) === today ? nowTime : undefined}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                    <span className="text-label text-fg">{t("services.repeat")}</span>
                    <Select value={repeat} onValueChange={setRepeat}>
                      <SelectTrigger aria-label={t("services.repeat")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPEATS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`services.repeat.${r}` as never)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Only once it repeats. An end date on a one-off is a
                      question about something that cannot happen. */}
                  {repeat === "never" ? null : (
                    <Field label={t("services.until")} className="flex-1">
                      <DateField name="untilOn" min={addDate || addOn || today} />
                    </Field>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={pending}>{t("action.add")}</Button>
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    {t("action.cancel")}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          ) : null}
          {viewBar}
        </div>
      </div>

      {rows.length === 0 && view !== "calendar" ? (
        <EmptyState title={t("services.none.title")} body={t("services.none.body")} />
      ) : view === "calendar" ? (
        <MonthGrid
          month={month}
          rows={rows}
          today={today}
          actions={actionsFor}
          onCreate={canEdit ? (day) => { setAddOn(day); setAddDate(day); setAddError(undefined); setAdding(true); } : null}
        />
      ) : view === "tiles" ? (
        <Tiles rows={rows} actions={actionsFor} />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>{t("services.date")}</Th>
                <Th>{t("services.name")}</Th>
                <Th>{t("services.time")}</Th>
                <Th>{t("services.attendance")}</Th>
                <Th>{t("services.status")}</Th>
                <Th> </Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((row) => {
                const cancelled = row.status === "cancelled";
                return (
                  <Tr key={row.id}>
                    <Td className={cancelled ? "text-fg-subtle" : undefined}>{row.readableDate}</Td>
                    <Td className={cancelled ? "text-fg-subtle" : undefined}>
                      <span className="flex flex-wrap items-center gap-2">
                        {row.name}
                        {row.special || !row.frequency ? null : (
                          <Badge tone="neutral">
                            <Repeat className="size-3" />
                            {t(`services.repeatBadge.${row.frequency}` as never)}
                          </Badge>
                        )}
                        {row.note ? <span className="text-caption text-fg-muted">{row.note}</span> : null}
                      </span>
                    </Td>
                    <Td className={cancelled ? "text-fg-subtle" : undefined}>{row.readableTime}</Td>
                    <Td>
                      {/* The headcount is the church's own number, so it wins.
                          Otherwise the names ticked on the roster stand in, and
                          a service with neither says so. */}
                      {cancelled ? null : row.total !== null ? (
                        <span className="text-fg">{row.total}</span>
                      ) : row.present > 0 ? (
                        <span className="text-fg">{plural("roster.present", row.present)}</span>
                      ) : (
                        <span className="text-fg-subtle">{t("services.notCounted")}</span>
                      )}
                    </Td>
                    <Td>
                      {/* Three states, not two. A service that has already
                          started is held, whatever the calendar says. */}
                      <Badge tone={cancelled ? "warning" : row.past ? "success" : "neutral"}>
                        {cancelled
                          ? t("services.status.cancelled")
                          : row.past
                            ? t("services.status.held")
                            : t("services.status.upcoming")}
                      </Badge>
                    </Td>
                    <Td>
                      {canEdit ? (
                        <span className="flex flex-wrap justify-end gap-1">
                          {rowActions(row)}
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

/**
 * Cancelling one week.
 *
 * The confirm button is a plain press rather than a DialogClose wrapping a
 * submit. DialogContent is portaled, so a submit button inside it sits outside
 * its own form in the DOM and submits nothing, and DialogClose tears the form
 * down before React runs the action either way. Both were true here, and the
 * button did nothing at all.
 */
function CancelDialog({
  row,
  pending,
  onConfirm,
}: {
  row: GatheringRow;
  pending: boolean;
  onConfirm: (note: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><X /> {t("services.cancel")}</Button>
      </DialogTrigger>
      <DialogContent
        alert
        title={t("services.cancelTitle", { name: row.name, date: row.readableDate })}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("services.cancelBody")}</p>

          <Field label={t("services.note")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("services.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                onConfirm(note);
                setOpen(false);
              }}
            >
              {t("services.cancelAction", { name: row.name, date: row.readableDate })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Changing a service's own details: what it is called, when it is, and the note. */
function EditDialog({
  row,
  pending,
  onSave,
}: {
  row: GatheringRow;
  pending: boolean;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(row.name);
  const [note, setNote] = React.useState(row.note ?? "");

  // Reopening after a change elsewhere should show what is there now, rather
  // than whatever was typed and abandoned last time.
  React.useEffect(() => {
    if (!open) {
      setName(row.name);
      setNote(row.note ?? "");
    }
  }, [open, row.name, row.note]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Pencil /> {t("services.edit")}</Button>
      </DialogTrigger>
      <DialogContent title={t("services.editTitle", { name: row.name })} closeLabel={t("common.close")}>
        <form
          action={(data) => {
            onSave({
              name: String(data.get("name") ?? ""),
              occursOn: String(data.get("occursOn") ?? ""),
              startsAt: String(data.get("startsAt") ?? ""),
              note: String(data.get("note") ?? ""),
            });
            setOpen(false);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field label={t("services.name")} required>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label={t("services.date")} required className="flex-1">
              <DateField name="occursOn" defaultValue={row.occursOn} />
            </Field>
            <Field label={t("services.time")} required className="flex-1">
              <TimeField name="startsAt" defaultValue={row.startsAt} />
            </Field>
          </div>
          <Field label={t("services.note")}>
            <Input name="note" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>
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

/**
 * R7.2. Counting heads.
 *
 * Three boxes and a note, which is the whole of attendance for most churches
 * this size and always will be. A box left empty means nobody counted, which is
 * a different fact from a zero and is kept apart from it.
 */
function CountDialog({
  row,
  pending,
  onSave,
}: {
  row: GatheringRow;
  pending: boolean;
  onSave: (fields: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const value = (n: number | null) => (n === null ? "" : String(n));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={row.total === null ? "secondary" : "ghost"}>
          <Users /> {t("services.count")}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={t("services.countTitle", { name: row.name, date: row.readableDate })}
        closeLabel={t("common.close")}
      >
        <form
          action={(data) => {
            onSave({
              adults: String(data.get("adults") ?? ""),
              children: String(data.get("children") ?? ""),
              visitors: String(data.get("visitors") ?? ""),
              note: String(data.get("note") ?? ""),
            });
            setOpen(false);
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap gap-4">
            <Field label={t("services.adults")} className="flex-1">
              <Input name="adults" type="number" min={0} inputMode="numeric" defaultValue={value(row.adults)} />
            </Field>
            <Field label={t("services.children")} className="flex-1">
              <Input name="children" type="number" min={0} inputMode="numeric" defaultValue={value(row.children)} />
            </Field>
            <Field label={t("services.visitors")} className="flex-1">
              <Input name="visitors" type="number" min={0} inputMode="numeric" defaultValue={value(row.visitors)} />
            </Field>
          </div>
          <Field label={t("services.note")}>
            <Input name="note" defaultValue={row.note ?? ""} autoComplete="off" />
          </Field>
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
