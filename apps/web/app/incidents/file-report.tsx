"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Banner, Button, Checkbox, Combobox, Field, Input, Textarea,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DateField } from "@/components/date-field";
import { report } from "../checkin/rooms/actions";
import { useFormError } from "@/lib/form-error";
import { useAnswered } from "@/components/form-actions";

/**
 * R8.13. Writing a report from the screen the leads read.
 *
 * The same form the class roster files, with the child and the class named here
 * because this is not the room. There is no edit afterwards, and the sheet says
 * so once, because that is a consequence somebody should know before they press.
 */
export function FileReport({
  church,
  today,
  members,
  rooms,
  services,
  trigger,
}: {
  church: string;
  today: string;
  members: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  services: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [memberId, setPersonId] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [notified, setNotified] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const full = useAnswered("incident-form", open);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        title={t("incident.add")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form="incident-form" disabled={pending || !full || !memberId}>
              {t("action.save")}
            </Button>
          </>
        }
      >
        <form
          id="incident-form"
          noValidate
          action={(data) => {
            startTransition(async () => {
              const result = await report(
                {
                  memberId,
                  roomId: roomId || null,
                  occurrenceId: serviceId || null,
                  occurredOn: String(data.get("occurredOn") ?? today),
                  volunteers: String(data.get("volunteers") ?? ""),
                  description: String(data.get("description") ?? ""),
                  action: String(data.get("action") ?? ""),
                  guardianNotified: notified,
                },
                church,
              );
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                setPersonId("");
                setRoomId("");
                setServiceId("");
                setNotified(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("incident.failed")}>{error}</Banner> : null}

          <Field label={t("incident.who")} required>
            <Combobox
              options={members.map((p) => ({ value: p.id, label: p.name }))}
              value={memberId}
              onChange={setPersonId}
              emptyLabel={t("incident.noPerson")}
              clearLabel={t("date.clear")}
            />
          </Field>

          <Field label={t("incident.date")} required>
            <DateField name="occurredOn" defaultValue={today} max={today} />
          </Field>

          <Field label={t("incident.room")}>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {services.length > 0 ? (
            <Field label={t("incident.service")}>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field label={t("incident.description")} required>
            <Textarea name="description" rows={4} />
          </Field>

          <Field label={t("incident.action")} required>
            <Textarea name="action" rows={3} />
          </Field>

          <Field label={t("incident.volunteers")}>
            <Input name="volunteers" autoComplete="off" />
          </Field>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={notified} onCheckedChange={(on) => setNotified(on === true)} />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {t("incident.notified")}
            </span>
          </label>
        </form>
      </SheetContent>
    </Sheet>
  );
}
