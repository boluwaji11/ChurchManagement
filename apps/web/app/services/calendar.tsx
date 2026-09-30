"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Undo2, Repeat, Pencil } from "lucide-react";
import {
  Badge, Banner, Button, Card, Checkbox, EmptyState, Field, Input,
  Table, Thead, Th, Tr, Td, Dialog, DialogTrigger, DialogContent, DialogClose,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { addGathering, setCancelled, removeGathering, stopRepeat, editGathering } from "./actions";

export interface GatheringRow {
  id: string;
  name: string;
  occursOn: string;
  startsAt: string;
  status: string;
  note: string | null;
  special: boolean;
  serviceTimeId: string | null;
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
}: {
  church: string;
  rows: GatheringRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [repeats, setRepeats] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  const act = (
    fn: (d: FormData) => Promise<{ error?: string }>,
    data: FormData,
    after?: () => void,
  ) => {
    data.set("church", church);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
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

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("services.title")}>{error}</Banner> : null}

      {canEdit ? (
        <div>
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button><Plus /> {t("services.add")}</Button>
            </DialogTrigger>
            <DialogContent title={t("services.add")} closeLabel={t("common.close")}>
              <form
                action={(data) => {
                  data.set("repeats", repeats ? "1" : "0");
                  act(addGathering, data, () => setAdding(false));
                }}
                noValidate
                className="flex flex-col gap-4"
              >
                <Field label={t("services.name")} required>
                  <Input name="name" autoComplete="off" />
                </Field>
                <div className="flex flex-wrap gap-4">
                  <Field label={t("services.date")} required className="flex-1">
                    <DateField name="occursOn" />
                  </Field>
                  <Field label={t("services.time")} required className="flex-1">
                    <TimeField name="startsAt" />
                  </Field>
                </div>
                <label className="flex items-center gap-2.5 text-[length:var(--d-text-body)] text-fg">
                  <Checkbox checked={repeats} onCheckedChange={(v) => setRepeats(v === true)} />
                  {t("services.repeatsLabel")}
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={pending}>{t("action.add")}</Button>
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    {t("action.cancel")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title={t("services.none.title")} body={t("services.none.body")} />
      ) : (
        <Card className="p-0">
          <Table>
            <Thead>
              <tr>
                <Th>{t("services.date")}</Th>
                <Th>{t("services.name")}</Th>
                <Th>{t("services.time")}</Th>
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
                        {row.special ? null : <Badge tone="neutral"><Repeat className="size-3" /> {t("services.repeats")}</Badge>}
                        {row.note ? <span className="text-caption text-fg-muted">{row.note}</span> : null}
                      </span>
                    </Td>
                    <Td className={cancelled ? "text-fg-subtle" : undefined}>{row.readableTime}</Td>
                    <Td>
                      <Badge tone={cancelled ? "warning" : "success"}>
                        {cancelled ? t("services.status.cancelled") : t("services.status.scheduled")}
                      </Badge>
                    </Td>
                    <Td>
                      {canEdit ? (
                        <span className="flex flex-wrap justify-end gap-1">
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
                          {row.special ? (
                            <Button
                              variant="ghost"
                              onClick={() => simple(removeGathering, { id: row.id })}
                            >
                              {t("services.remove")}
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost">{t("services.stopRepeat")}</Button>
                              </DialogTrigger>
                              <DialogContent
                                title={t("services.stopRepeatTitle", { name: row.name })}
                                closeLabel={t("common.close")}
                              >
                                <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                                  {t("services.stopRepeatBody")}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
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
                                  <DialogClose asChild>
                                    <Button variant="ghost">{t("action.cancel")}</Button>
                                  </DialogClose>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
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
        title={t("services.cancelTitle", { name: row.name, date: row.readableDate })}
        closeLabel={t("common.close")}
      >
        <div className="flex flex-col gap-4">
          <Field label={t("services.note")}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                onConfirm(note);
                setOpen(false);
              }}
            >
              {t("services.cancel")}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("action.cancel")}</Button>
          </div>
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
