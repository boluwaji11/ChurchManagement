"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarRange, X, Undo2 } from "lucide-react";
import {
  Badge, Banner, Button, Card, EmptyState, Field, Input,
  Table, Thead, Th, Tr, Td, Dialog, DialogTrigger, DialogContent, DialogClose,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { fillCalendar, addGathering, setCancelled, removeGathering } from "./actions";

export interface GatheringRow {
  id: string;
  name: string;
  occursOn: string;
  startsAt: string;
  status: string;
  note: string | null;
  special: boolean;
  readableDate: string;
  readableTime: string;
}

/**
 * R7.1. The calendar, and the three things a church does to it.
 *
 * Fill it from the weekly pattern, add the one-offs, and say which weeks did
 * not happen. A cancelled gathering stays on the list, greyed, because a Sunday
 * that vanished leaves a gap in the attendance record that reads as a collapse.
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
  const [added, setAdded] = React.useState<number>();
  const [pending, startTransition] = React.useTransition();
  const [filling, setFilling] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  const act = (
    fn: (d: FormData) => Promise<{ error?: string; added?: number }>,
    data: FormData,
    after?: () => void,
  ) => {
    data.set("church", church);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
      setAdded(result.added);
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
      {added !== undefined && !error ? (
        <Banner tone="success" title={plural("services.filled", added)} />
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button><Plus /> {t("services.add")}</Button>
            </DialogTrigger>
            <DialogContent title={t("services.add")} closeLabel={t("common.close")}>
              <form
                action={(data) => act(addGathering, data, () => setAdding(false))}
                noValidate
                className="flex flex-col gap-4"
              >
                <Field label={t("services.name")} required>
                  <Input name="name" autoComplete="off" />
                </Field>
                <Field label={t("services.date")} required>
                  <DateField name="occursOn" />
                </Field>
                <Field label={t("services.time")} required>
                  <TimeField name="startsAt" />
                </Field>
                <Field label={t("services.note")}>
                  <Input name="note" autoComplete="off" />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={pending}>{t("action.add")}</Button>
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    {t("action.cancel")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={filling} onOpenChange={setFilling}>
            <DialogTrigger asChild>
              <Button variant="secondary"><CalendarRange /> {t("services.fill")}</Button>
            </DialogTrigger>
            <DialogContent title={t("services.fillTitle")} closeLabel={t("common.close")}>
              <form
                action={(data) => act(fillCalendar, data, () => setFilling(false))}
                noValidate
                className="flex flex-col gap-4"
              >
                <Field label={t("services.from")} required>
                  <DateField name="from" />
                </Field>
                <Field label={t("services.to")} required>
                  <DateField name="to" />
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={pending}>{t("services.fill")}</Button>
                  <Button type="button" variant="ghost" onClick={() => setFilling(false)}>
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
                        {row.special ? <Badge tone="neutral">{t("services.special")}</Badge> : null}
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
                          {cancelled ? (
                            <Button
                              variant="ghost"
                              onClick={() => simple(setCancelled, { id: row.id, cancelled: "0" })}
                            >
                              <Undo2 /> {t("services.restore")}
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost"><X /> {t("services.cancel")}</Button>
                              </DialogTrigger>
                              <DialogContent
                                title={t("services.cancelTitle", { name: row.name, date: row.readableDate })}
                                closeLabel={t("common.close")}
                              >
                                <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                                  {t("services.cancelBody")}
                                </p>
                                <form
                                  action={(data) => {
                                    data.set("id", row.id);
                                    data.set("cancelled", "1");
                                    act(setCancelled, data);
                                  }}
                                  className="flex flex-col gap-4"
                                >
                                  <Field label={t("services.note")}>
                                    <Input name="note" autoComplete="off" />
                                  </Field>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <DialogClose asChild>
                                      <Button type="submit" variant="danger">{t("services.cancel")}</Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                      <Button type="button" variant="ghost">{t("action.cancel")}</Button>
                                    </DialogClose>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                          {row.special ? (
                            <Button
                              variant="ghost"
                              onClick={() => simple(removeGathering, { id: row.id })}
                            >
                              {t("services.remove")}
                            </Button>
                          ) : null}
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
